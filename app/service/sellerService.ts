import { SellerRepository } from 'app/repository/sellerRepository';
import { GetToken, VerifyToken } from 'app/utility/password';
import { ErrorResponse, SucessResponse } from 'app/utility/response';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { plainToClass } from 'class-transformer';
import { SellerProgramInput } from 'app/models/dto/JoinSellerProgramInput';
import { AppValidationError } from 'app/utility/errors';
import { PaymentMethodInput } from 'app/models/dto/createPaymentMethod';

export class SellerService {
  repository: SellerRepository;
  constructor(repository: SellerRepository) {
    this.repository = repository;
  }

  async JoinSellerProgram(event: APIGatewayProxyEventV2) {
    const payload = await VerifyToken(event.headers.authorization);
    if (!payload) return ErrorResponse(403, 'authorization failed!');

    const input = plainToClass(SellerProgramInput, event.body);
    const error = await AppValidationError(input);

    if (error) return ErrorResponse(404, error);

    const { firstName, lastName, phoneNumber, address } = input;

    const enrolled = await this.repository.checkEnrolledProgram(
      payload.user_id
    );
    if (enrolled)
      return ErrorResponse(
        403,
        'You have already enrolled for seller program, you can sell your products now'
      );

    const updatedUser = await this.repository.updateProfile({
      firstName,
      lastName,
      phoneNumber,
      userId: payload.user_id,
    });

    if (!updatedUser)
      return ErrorResponse(500, 'Error on joining seller program');

    await this.repository.updateAddress({
      ...address,
      user_id: payload.user_id,
    });

    const result = await this.repository.createPaymentMethod({
      ...input,
      user_id: payload.user_id,
    });

    if (result) {
      const token = await GetToken(updatedUser);

      return SucessResponse({
        message: 'successfully joined seller program',
        seller: {
          token,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          phone: updatedUser.phone,
          userType: updatedUser.user_type,
          _id: updatedUser.user_id,
        },
      });
    } else {
      return ErrorResponse(500, 'Error on joining seller program');
    }
  }

  async GetPaymentMethods(event: APIGatewayProxyEventV2) {
    const payload = await VerifyToken(event.headers.authorization);
    if (!payload) return ErrorResponse(403, 'authorization failed!');

    const paymentMethods = await this.repository.getPaymentMethods(
      payload.user_id
    );

    return SucessResponse({ paymentMethods });
  }

  async EditPaymentMethods(event: APIGatewayProxyEventV2) {
    const payment_id = Number(event.pathParameters.id);

    const payload = await VerifyToken(event.headers.authorization);
    if (!payload) return ErrorResponse(403, 'authorization failed!');

    const input = plainToClass(PaymentMethodInput, event.body);
    const error = await AppValidationError(input);

    if (error) return ErrorResponse(404, error);

    const result = await this.repository.updatePaymentMethod({
      ...input,
      payment_id,
      user_id: payload.user_id,
    });

    if (result) {
      return SucessResponse({ msg: 'Payment method updated' });
    } else {
      return ErrorResponse(500, 'Error on joining seller program');
    }
  }
}
