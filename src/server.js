import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import http from "http";
import cron from "node-cron";
import swaggerUI from "swagger-ui-express";

import { clearConversation } from "#jobs/clearConversation.job.js";
import { connectDB } from "#libs/db.js";
import { authMiddleware } from "#middlewares/authMiddleware.js";
import activityRoute from "#routes/activityRoute.js";
import authRoute from "#routes/authRoute.js";
import conversationRoute from "#routes/conversationRoute.js";
import friendRoute from "#routes/friendRoute.js";
import messageRoute from "#routes/messageRoute.js";
import notificationRoute from "#routes/notificationRoute.js";
import stickerRoute from "#routes/stickerRouter.js";
import userRoute from "#routes/userRoute.js";
import { createSocketServer, onlineUsers } from "#socket/index.js";

dotenv.config();

export const env = {
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  KLIPY_API_KEY_01: process.env.KLIPY_API_KEY_01,
  KLIPY_API_KEY_02: process.env.KLIPY_API_KEY_02,
  KLIPY_URL: process.env.KLIPY_URL,
};

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;
const allowedOrigins = ["http://localhost:5173", process.env.CLIENT_URL]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

const corsOptions = {
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
};

const io = createSocketServer(server, corsOptions);

app.set("onlineUsers", onlineUsers);
app.set("io", io);

//middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

//cloudinary.config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//swagger
const swaggerDocument = JSON.parse(fs.readFileSync("./swagger.json", "utf-8"));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

//public routes
app.use("/api/auth", authRoute);

//private routes
app.use(authMiddleware);
app.use("/api/users", userRoute);
app.use("/api/friends", friendRoute);
app.use("/api/messages", messageRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/stickers", stickerRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/activities", activityRoute);

cron.schedule(
  "0 9 * * *",
  async () => {
    await clearConversation();
  },
  {
    timezone: "Asia/Ho_Chi_Minh",
  },
);
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
