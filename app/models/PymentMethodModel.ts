export interface PaymentMethodModel {
  // no id
  user_id: number;

  bank_account: string;
  swift_code: string;
  payment_type: string;

  created_at: string;
  updated_at: string;
}

// SQL    should match with Model

/*
    "id"                bigserial   PRIMARY KEY,

    "user_id"           bigint      NOT NULL
    
    "bank_account"      bigint 
    "swift_code"        varchar
    "payment_type"      varchar

    "created_at"        timestamptz NOT NULL DEFAULT (now())
    "updated_at"        timestamptz NOT NULL DEFAULT (now())
*/
