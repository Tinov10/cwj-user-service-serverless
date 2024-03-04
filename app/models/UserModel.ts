import { AddressModel } from './AddressModel';

export interface UserModel {
  user_id?: number;

  email: string;
  password: string;
  salt: string;
  user_type: 'BUYER' | 'SELLER';

  // seller program
  first_name?: string;
  last_name?: string;
  phone: string;

  // different table
  address?: AddressModel[];

  profile_pic?: string;
  verification_code?: number;
  expiry?: string;

  // payment later added
  stripe_id?: string;
  payment_id?: string;
}

/*

CREATE TABLE "users" (
  "user_id"           bigserial   PRIMARY KEY,

  "email"             varchar     UNIQUE NOT NULL,
  "password"          varchar     NOT NULL,
  "salt"              varchar     NOT NULL,
  "user_type"         varchar     NOT NULL,

  "profile_pic"       text,
  "verification_code" integer,
  "expiry"            timestamptz,
 
  "first_name"        varchar,
  "last_name"         varchar,
  "phone"             varchar     NOT NULL,

  "verified"          boolean     NOT NULL DEFAULT FALSE,
  "created_at"        timestamptz NOT NULL DEFAULT (now())
);

CREATE INDEX ON "users" ("phone")

*/
