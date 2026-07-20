import axios from "axios";
import { env } from "../config/env.js";
export const apiKlipy = axios.create({
  baseURL: env.KLIPY_URL,
});
