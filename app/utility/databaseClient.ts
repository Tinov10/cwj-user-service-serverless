import { Client } from "pg";

export const DBClient = () => {
  return new Client({
    host: "xxxxxxxxxx.eu-central-1.compute.amazonaws.com",
    user: "user_service",
    database: "user_service",
    password: "user_service#2023",
    port: 5432,
  });
  // return new Client({
  //   user: "root",
  //   host: "127.0.0.1",
  //   database: "user_service",
  //   password: "root",
  //   port: 5432,
  // });
};
