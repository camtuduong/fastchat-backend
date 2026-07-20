import dotenv from "dotenv";

dotenv.config();

export const env = {
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  KLIPY_API_KEY_01: process.env.KLIPY_API_KEY_01,
  KLIPY_API_KEY_02: process.env.KLIPY_API_KEY_02,
  KLIPY_URL: process.env.KLIPY_URL,
};
