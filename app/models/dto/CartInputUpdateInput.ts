import { IsNumber } from 'class-validator';

export class UpdateCartInput {
  @IsNumber()
  qty: number;
}
