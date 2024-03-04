import { ShoppingCartModel } from '../models/ShoppingCartModel';
import { DBOperation } from './dbOperation';
import { CartItemModel } from '../models/CartItemsModel';

export class CartRepository extends DBOperation {
  constructor() {
    super();
  }

  // create a shopping cart for a specific user (only provide userId)
  async createShoppingCart(userId: number) {
    const queryString =
      'INSERT INTO shopping_carts(user_id) VALUES($1) RETURNING *';
    const values = [userId];
    const result = await this.executeQuery(queryString, values);
    return result.rowCount > 0 ? (result.rows[0] as ShoppingCartModel) : false;
  }

  // create new cart ITEM
  async createCartItem({
    cart_id,
    product_id,
    item_qty,
    //
    name,
    image_url,
    price,
  }: CartItemModel) {
    const queryString =
      'INSERT INTO cart_items(cart_id, product_id,name,image_url,price,item_qty) VALUES($1,$2,$3,$4,$5,$6) RETURNING *';
    const values = [cart_id, product_id, name, image_url, price, item_qty];
    const result = await this.executeQuery(queryString, values);
    return result.rowCount > 0 ? (result.rows[0] as CartItemModel) : false;
  }

  // change qty by CartItemId (cartItem = shoppingCart = User)
  async updateCartItemById(itemId: number, qty: number) {
    const queryString =
      'UPDATE cart_items SET item_qty=$1 WHERE item_id=$2 RETURNING *';

    const values = [qty, itemId];
    const result = await this.executeQuery(queryString, values);

    return result.rowCount > 0 ? (result.rows[0] as CartItemModel) : false;
  }

  // ByProductId
  // change qty???
  // i think we have to add WHERE product_id AND shopping_cart_id
  async updateCartItemByProductId(
    productId: string,
    qty: number,
    cartId: number
  ) {
    const queryString =
      'UPDATE cart_items SET item_qty=$1 WHERE product_id=$2 AND cart_id = $3 RETURNING *';
    const values = [qty, productId, cartId];
    const result = await this.executeQuery(queryString, values);
    return result.rowCount > 0 ? (result.rows[0] as CartItemModel) : false;
  }

  // find just a shopping_cart for a specific user based on userId = simple
  async findShoppingCart(userId: number) {
    const queryString =
      'SELECT cart_id, user_id FROM shopping_carts WHERE user_id=$1';
    const values = [userId];
    const result = await this.executeQuery(queryString, values);
    return result.rowCount > 0 ? (result.rows[0] as ShoppingCartModel) : false;
  }

  async findCartItemByProductId(productId: string, cartId: number) {
    const queryString =
      'SELECT product_id, price, item_qty FROM cart_items WHERE product_id = $1 AND cart_id = $2';
    const values = [productId, cartId];
    const result = await this.executeQuery(queryString, values);
    return result.rowCount > 0 ? (result.rows[0] as CartItemModel) : false;
  }

  // find cartItems when only having the userId so we have to inner join with the shoppingCart table
  async findCartItems(userId: number) {
    const queryString = `SELECT 
    ci.cart_id,
    ci.item_id,
    ci.product_id,
    ci.name,
    ci.price,
    ci.item_qty,
    ci.image_url,
    ci.created_at FROM shopping_carts sc INNER JOIN cart_items ci ON sc.cart_id=ci.cart_id WHERE sc.user_id=$1`;
    const values = [userId];
    const result = await this.executeQuery(queryString, values);
    return result.rowCount > 0 ? (result.rows as CartItemModel[]) : [];
  }

  // find all items of a cart / user by CartId
  async findCartItemsByCartId(cartId: number) {
    const queryString =
      'SELECT product_id, name, image_url,  price, item_qty FROM cart_items WHERE cart_id = $1';
    const values = [cartId];
    const result = await this.executeQuery(queryString, values);
    return result.rowCount > 0 ? (result.rows as CartItemModel[]) : [];
  }

  // delete whole cart_item by CartItemId (cartItem = shoppingCart = User)
  deleteCartItem(id: number) {
    const queryString = 'DELETE FROM cart_items WHERE item_id=$1';
    const values = [id];
    return this.executeQuery(queryString, values);
  }
}
