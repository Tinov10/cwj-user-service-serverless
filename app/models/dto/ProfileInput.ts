import { AddressInput } from './AddressInput';
import { Length } from 'class-validator';

export class ProfileInput {
  @Length(3, 32)
  firstName: string;

  @Length(3, 32)
  lastName: string;

  @Length(5, 6)
  userType: string;

  address: AddressInput;
}
