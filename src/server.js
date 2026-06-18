import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./libs/db.js";

import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import friendRoute from "./routes/friendRoute.js";

import cookieParser from "cookie-parser";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import cors from "cors";

import swaggerUI from "swagger-ui-express";
import fs from "fs";

dotenv.config();

export const env = {
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
};
const app = express();
const PORT = process.env.PORT || 5001;
const allowedOrigins = ["http://localhost:5173", process.env.CLIENT_URL]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

//middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

//swagger
const swaggerDocument = JSON.parse(fs.readFileSync("./swagger.json", "utf-8"));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

//public routes
app.use("/api/auth", authRoute);

//private routes
app.use(authMiddleware);
app.use("/api/users", userRoute);
app.use("/api/friends", friendRoute);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
