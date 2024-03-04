import { CreatePaymentSessionInput } from '../models/dto/ICreatePaymentSessionInput';
import Stripe from 'stripe';

export const STRIPE_SECRET_KEY = 'xxxxxxxxxxxxxx'; //process.env.STRIPE_SECRET_KEY;
export const STRIPE_PUBLISHABLE_KEY = 'xxxxxxxxxxxxxx'; //process.env.STRIPE_PUBLISHABLE_KEY;

export const APPLICATION_FEE = (totalAmount: number) => {
  const appFee = 1.5; // application fee in %
  return (totalAmount / 100) * appFee;
};

export const STRIPE_FEE = (totalAmount: number) => {
  const perTransaction = 2.9; // 2.9 % per transaction
  const fixCost = 0.29; // 29 cents
  const stripeCost = (totalAmount / 100) * perTransaction;
  return stripeCost + fixCost;
};

// kinda like client
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

export const CreatePaymentSession = async ({
  email,
  amount,
  phone,
  customerId, // optional when we first buy we don't have a customerId = stripe_id
}: CreatePaymentSessionInput) => {
  let currentCustomerId: string;

  // 1
  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    currentCustomerId = customer.id;
  } else {
    const customer = await stripe.customers.create({
      email,
    });
    currentCustomerId = customer.id;
  }

  // 2
  const { client_secret, id } = await stripe.paymentIntents.create({
    customer: currentCustomerId,
    payment_method_types: ['card'],
    amount: parseInt(`${amount * 100}`), // need to assign as cents
    currency: 'usd',
  });

  return {
    customerId: currentCustomerId,
    secret: client_secret,
    paymentId: id,
    publishableKey: STRIPE_PUBLISHABLE_KEY,
  };
};

export const RetrivePayment = async (paymentId: string) => {
  return stripe.paymentIntents.retrieve(paymentId);
};
