import { UserModel } from '../models/UserModel';
import { DBOperation } from './dbOperation';
import { AddressInput } from '../models/dto/AddressInput';
import { SellerProgramInput } from 'app/models/dto/JoinSellerProgramInput';
import { PaymentMethodModel } from 'app/models/PymentMethodModel';
import { PaymentMethodInput } from 'app/models/dto/createPaymentMethod';

export class SellerRepository extends DBOperation {
  constructor() {
    super();
  }

  async checkEnrolledProgram(userId: number) {
    const queryString =
      'SELECT user_type from users WHERE user_id=$1 and user_type=$2';
    const values = [userId, 'SELLER'];
    const result = await this.executeQuery(queryString, values);

    if (result.rowCount > 0) {
      return true;
    }
    return false;
  }

  // additional info not given when signing up
  async updateProfile(input: {
    userId: number;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }) {
    const queryString =
      'UPDATE users SET first_name=$1, last_name=$2, phone=$3, user_type=$4 WHERE user_id=$5 RETURNING *';

    const values = [
      input.firstName,
      input.lastName,
      input.phoneNumber,
      'SELLER',
      input.userId,
    ];
    const result = await this.executeQuery(queryString, values);

    if (result.rowCount > 0) {
      return result.rows[0] as UserModel;
    }
    return false;
  }

  // if we have an address udate otherwise insert so frist try to find
  async updateAddress(input: AddressInput & { user_id: number }) {
    const addressQueryString = 'SELECT * FROM address WHERE user_id=$1'; // normal '

    const addressValues = [input.user_id];
    const addressResult = await this.executeQuery(
      addressQueryString,
      addressValues
    );

    let queryString = `INSERT INTO address(address_line1, address_line2, city, post_code, country, user_id) VALUES ($1, $2, $3, $4, $5, $6)`; // back ticks

    const values = [
      input.addressLine1,
      input.addressLine2,
      input.city,
      input.postCode,
      input.country,
      input.user_id,
    ];

    if (addressResult.rowCount > 0) {
      queryString = `UPDATE address SET address_line1=$1, address_line2=$2, city=$3, post_code=$4, country=$5 WHERE user_id=$6)`; // back ticks
    }
    return this.executeQuery(queryString, values);
  }

  async createPaymentMethod(input: SellerProgramInput & { user_id: number }) {
    const queryString = `INSERT INTO payment_methods(bank_account, swift_code, payment_type, user_id) VALUES ($1, $2, $3, $4)`; // back ticks

    // bankAccountNumber received as string
    const values = [
      Number(input.bankAccountNumber),
      input.swiftCode,
      input.paymentType,
      input.user_id,
    ];
    const result = await this.executeQuery(queryString, values);
    // true or false
    return result.rowCount > 0;
  }

  async getPaymentMethods(userId: number) {
    const queryString = 'SELECT * FROM payment_methods WHERE user_id=$1';

    const values = [userId];
    const result = await this.executeQuery(queryString, values);

    if (result.rowCount < 1) {
      throw new Error('Payment methods does not exist');
    }
    return result.rows[0] as PaymentMethodModel;
  }

  async updatePaymentMethod(
    input: PaymentMethodInput & { payment_id: number; user_id: number }
  ) {
    const queryString =
      'UPDATE payment_methods SET bank_account=$1, swift_code=$2, payment_type=$3 WHERE id=$4 AND user_id=$5 RETURNING *';

    const values = [
      Number(input.bankAccountNumber),
      input.swiftCode,
      input.paymentType,
      input.payment_id,
      input.user_id,
    ];
    return this.executeQuery(queryString, values);
  }
}
