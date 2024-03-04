import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { SucessResponse, ErrorResponse } from '../utility/response';
import { autoInjectable } from 'tsyringe';
import { plainToClass } from 'class-transformer';
import { AppValidationError } from '../utility/errors';
import { VerifyToken } from '../utility/password';
import { CartRepository } from '../repository/cartRepository';
import { CartInput, UpdateCartInput } from '../models/dto/CartInput';
import { CartItemModel } from '../models/CartItemsModel';
import { PullData } from '../utility/pullData';
import aws from 'aws-sdk';
import { UserRepository } from '../repository/userRepository';
import {
  APPLICATION_FEE,
  CreatePaymentSession,
  RetrivePayment,
  STRIPE_FEE,
} from '../utility/payment';

@autoInjectable()
export class CartService {
  repository: CartRepository;

  constructor(repository: CartRepository) {
    this.repository = repository;
  }

  async CreateCart(event: APIGatewayProxyEventV2) {
    try {
      const payload = await VerifyToken(event.headers.authorization);
      if (!payload) return ErrorResponse(403, 'authorization failed!');

      const input = plainToClass(CartInput, event.body);
      const error = await AppValidationError(input);
      if (error) return ErrorResponse(404, error);

      // 1 Do we already have a cart? If not create one.
      let currentCart = await this.repository.findShoppingCart(payload.user_id);
      if (!currentCart)
        currentCart = await this.repository.createShoppingCart(payload.user_id);

      if (!currentCart) {
        return ErrorResponse(500, 'create cart is failed!');
      }

      // 2 Find out if the product is already on the cart (only relevant when we had an old cart)
      let currentProduct = await this.repository.findCartItemByProductId(
        input.productId,
        currentCart.cart_id
      );

      if (currentProduct) {
        // if the product is already on the shopping list update the qty
        await this.repository.updateCartItemByProductId(
          input.productId,
          (currentProduct.item_qty += input.qty),
          currentCart.cart_id
        );
      } else {
        // if the product is not already on the cart
        // call Product service via webhook to get the needed product information
        const { data, status } = await PullData({
          action: 'PULL_PRODUCT_DATA',
          productId: input.productId,
        });

        if (status !== 200) {
          return ErrorResponse(500, 'failed to get product data!');
        }

        // we receice a data object from axios that holds a data object
        let cartItem = data.data as CartItemModel;
        // we "make" a cartItem by adding the product to the shopping_cart
        cartItem.cart_id = currentCart.cart_id;
        cartItem.item_qty = input.qty;
        // Finally create cart item
        await this.repository.createCartItem(cartItem);
      }

      // return all cart items to client
      const cartItems = await this.repository.findCartItemsByCartId(
        currentCart.cart_id
      );

      return SucessResponse(cartItems);
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }

  // get all the cart items by userId = INNER JOIN
  async GetCart(event: APIGatewayProxyEventV2) {
    try {
      const payload = await VerifyToken(event.headers.authorization);
      if (!payload) return ErrorResponse(403, 'authorization failed!');

      // INNER JOIN
      const cartItems = await this.repository.findCartItems(payload.user_id);

      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.price * item.item_qty,
        0
      );

      const appFee = APPLICATION_FEE(totalAmount) + STRIPE_FEE(totalAmount);

      return SucessResponse({ cartItems, totalAmount, appFee });
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }

  // update the qty of a single cart item by the id of the item = very simple
  async UpdateCart(event: APIGatewayProxyEventV2) {
    try {
      const cartItemId = Number(event.pathParameters.id);

      const payload = await VerifyToken(event.headers.authorization);
      if (!payload) return ErrorResponse(403, 'authorization failed!');

      const input = plainToClass(UpdateCartInput, event.body);

      const cartItem = await this.repository.updateCartItemById(
        cartItemId,
        input.qty
      );

      if (cartItem) {
        return SucessResponse(cartItem);
      }
      return ErrorResponse(404, 'item does not exist');
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }

  // delete a single cart item by the id of the item = very simple
  async DeleteCart(event: APIGatewayProxyEventV2) {
    try {
      const cartItemId = Number(event.pathParameters.id);

      const payload = await VerifyToken(event.headers.authorization);
      if (!payload) return ErrorResponse(403, 'authorization failed!');

      const deletedItem = await this.repository.deleteCartItem(cartItemId);

      return SucessResponse(deletedItem);
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }

  //////////////////////////////////////////////////////////////////

  // user wants to pay
  async CollectPayment(event: APIGatewayProxyEventV2) {
    try {
      const payload = await VerifyToken(event.headers.authorization);
      if (!payload) return ErrorResponse(403, 'authorization failed!');

      // how do we get the stripe_id or in db already or not in db when the user buys for the first time something so it is optional we're not always getting it
      // this.repository = cartRepository --> new UserRepository
      const { stripe_id, email, phone } =
        await new UserRepository().getUserProfile(payload.user_id);

      // fetch all cartItems by userId = INNER JOIN (like GetCart above)
      const cartItems = await this.repository.findCartItems(payload.user_id);

      const total = cartItems.reduce(
        (sum, item) => sum + item.price * item.item_qty,
        0
      );

      const appFee = APPLICATION_FEE(total);
      const stripeFee = STRIPE_FEE(total);
      const amount = total + appFee + stripeFee;

      // initilize Payment gateway
      const { secret, publishableKey, customerId, paymentId } =
        await CreatePaymentSession({
          customerId: stripe_id, // optional stripe_id (when we first buy we don't have)
          email,
          phone,
          amount,
        });

      await new UserRepository().updateUserPayment({
        userId: payload.user_id,
        //
        customerId, // we get it from stripe or had it already
        paymentId,
      });

      // what are we doing with the secret and publishableKey???
      // we send it back to the user
      // with this data the user can pay to stripe
      // inside the PlaceOrder (see below) function we check if the payment was successfull

      return SucessResponse({ secret, publishableKey });
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }

  async PlaceOrder(event: APIGatewayProxyEventV2) {
    /* Check if the payment was successfull, if so send SNS topic */

    // is user authenticated?
    const payload = await VerifyToken(event.headers.authorization);
    if (!payload) return ErrorResponse(403, 'authorization failed!');

    // we get the payment_id when we CreatePaymentSession
    // we have stored it
    const { payment_id } = await new UserRepository().getUserProfile(
      payload.user_id
    );

    // based on the payment_id we can retrive from stripe
    const paymentInfo = await RetrivePayment(payment_id);

    if (paymentInfo.status === 'succeeded') {
      const cartItems = await this.repository.findCartItems(payload.user_id);

      // Send SNS topic to create Order [Transaction MS] => email to user

      const params = {
        Message: JSON.stringify({
          transaction: paymentInfo,
          userId: payload.user_id,
          items: cartItems, // []
        }),
        TopicArn: process.env.SNS_TOPIC, // we created it inside serverless.yml
        MessageAttributes: {
          actionType: {
            DataType: 'String',
            StringValue: 'place_order', // filter
          },
        },
      };
      const sns = new aws.SNS();
      const response = await sns.publish(params).promise();

      console.log(response);

      // update payment id = ""
      // delete all cart items
      return SucessResponse({ msg: 'success', params });
    }

    // if (paymentInfo.status === 'succeeded') XXXX
    return ErrorResponse(503, new Error('payment failed!'));
  }
}
