import { Length } from 'class-validator';

// Input

export class PaymentMethodInput {
  @Length(6, 24)
  bankAccountNumber: string;

  @Length(6, 12)
  swiftCode: string;

  @Length(6, 12)
  paymentType: string;
}

// Model

// export interface PaymentMethodModel {
//   // no id
//   user_id: number;

//   bank_account: string;
//   swift_code: string;
//   payment_type: string;

//   created_at: string;
//   updated_at: string;
// }

// SQL

/*
    "id"                bigserial   PRIMARY KEY,

    "user_id"           bigint      NOT NULL
    
    "bank_account"      bigint 
    "swift_code"        varchar
    "payment_type"      varchar

    "created_at"        timestamptz NOT NULL DEFAULT (now())
    "updated_at"        timestamptz NOT NULL DEFAULT (now())
*/
