import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { SucessResponse, ErrorResponse } from '../utility/response';
import { UserRepository } from '../repository/userRepository';
import { autoInjectable } from 'tsyringe';
import { plainToClass } from 'class-transformer';
import { SignupInput } from '../models/dto/SignupInput';
import { AppValidationError } from '../utility/errors';
import {
  GetSalt,
  GetHashedPassword,
  ValidatePassword,
  GetToken,
  VerifyToken,
} from '../utility/password';
import { LoginInput } from '../models/dto/LoginInput';
import { VerificationInput } from '../models/dto/UpdateInput';
import {
  GenerateAccessCode,
  SendVerificationCode,
} from '../utility/notification';
import { TimeDifference } from '../utility/dateHelper';
import { ProfileInput } from '../models/dto/AddressInput';

@autoInjectable()
export class UserService {
  repository: UserRepository;
  constructor(repository: UserRepository) {
    this.repository = repository;
  }

  async CreateUser(event: APIGatewayProxyEventV2) {
    try {
      const input = plainToClass(SignupInput, event.body);
      const error = await AppValidationError(input);
      if (error) return ErrorResponse(404, error);

      const salt = await GetSalt();
      const hashedPassword = await GetHashedPassword(input.password, salt);

      const data = await this.repository.createAccount({
        email: input.email,
        password: hashedPassword,
        phone: input.phone,
        user_type: 'BUYER',
        salt: salt,
      });

      const token = GetToken(data);

      return SucessResponse({
        token,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        phone: data.phone,
        userType: data.user_type,
        _id: data.user_id,
      });

      //
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }

  async UserLogin(event: APIGatewayProxyEventV2) {
    try {
      const input = plainToClass(LoginInput, event.body);
      const error = await AppValidationError(input);
      if (error) return ErrorResponse(404, error);

      const data = await this.repository.findAccount(input.email);

      const verified = await ValidatePassword(
        input.password,
        data.password,
        data.salt
      );
      if (!verified) {
        throw new Error('password does not match!');
      }

      const token = GetToken(data);

      return SucessResponse({
        token,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        phone: data.phone,
        userType: data.user_type,
        _id: data.user_id,
      });
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }

  async CreateProfile(event: APIGatewayProxyEventV2) {
    try {
      const payload = await VerifyToken(event.headers.authorization);
      if (!payload) return ErrorResponse(403, 'authorization failed!');

      const input = plainToClass(ProfileInput, event.body);
      const error = await AppValidationError(input);
      if (error) return ErrorResponse(404, error);

      await this.repository.createProfile(payload.user_id, input);

      return SucessResponse({ message: 'profile created!' });
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }

  async EditProfile(event: APIGatewayProxyEventV2) {
    try {
      const payload = await VerifyToken(event.headers.authorization);
      if (!payload) return ErrorResponse(403, 'authorization failed!');

      const input = plainToClass(ProfileInput, event.body);
      const error = await AppValidationError(input);
      if (error) return ErrorResponse(404, error);

      await this.repository.editProfile(payload.user_id, input);

      return SucessResponse({ message: 'profile updated!' });
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }

  async GetVerificationToken(event: APIGatewayProxyEventV2) {
    const payload = await VerifyToken(event.headers.authorization);
    if (!payload) return ErrorResponse(403, 'authorization failed!');

    const { code, expiry } = GenerateAccessCode();

    // update the user and insert the newly created code
    await this.repository.updateVerificationCode(payload.user_id, code, expiry);

    // send the code to his phone
    await SendVerificationCode(code, payload.phone);

    return SucessResponse({
      message: 'verification code is sent to your registered mobile number!',
    });
  }

  // send code to server to verify the users phone number
  async VerifyUser(event: APIGatewayProxyEventV2) {
    const payload = await VerifyToken(event.headers.authorization);
    if (!payload) return ErrorResponse(403, 'authorization failed!');

    const input = plainToClass(VerificationInput, event.body);
    const error = await AppValidationError(input);
    if (error) return ErrorResponse(404, error);

    const { verification_code, expiry } = await this.repository.findAccount(
      payload.email
    );

    // find the user account
    if (verification_code === parseInt(input.code)) {
      // check expiry
      const currentTime = new Date();
      const diff = TimeDifference(expiry, currentTime.toISOString(), 'm');
      console.log('time diff', diff);

      if (diff > 0) {
        console.log('verified successfully!');
        await this.repository.updateVerifyUser(payload.user_id);
      } else {
        return ErrorResponse(403, 'verification code is expired!');
      }
    }
    return SucessResponse({ message: 'user verified!' });
  }

  async GetProfile(event: APIGatewayProxyEventV2) {
    try {
      const payload = await VerifyToken(event.headers.authorization);
      if (!payload) return ErrorResponse(403, 'authorization failed!');

      const data = await this.repository.getUserProfile(payload.user_id);

      return SucessResponse(data);
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }
}
