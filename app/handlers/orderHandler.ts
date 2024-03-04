import { APIGatewayProxyEventV2 } from 'aws-lambda';
import middy from '@middy/core';
import bodyParser from '@middy/http-json-body-parser';
import { CartService } from './../service/cartService';
import { CartRepository } from './../repository/cartRepository';

const cartService = new CartService(new CartRepository());

// User wants to pay

export const CollectPayment = middy((event: APIGatewayProxyEventV2) => {
  return cartService.CollectPayment(event);
}).use(bodyParser());

// publish to SNS which is connected to SQS
export const PlaceOrder = middy((event: APIGatewayProxyEventV2) => {
  return cartService.PlaceOrder(event);
}).use(bodyParser());
