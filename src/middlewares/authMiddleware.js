import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../server.js";

//middleware xac thuc nguoi dung
export const authMiddleware = async (req, res, next) => {
  try {
    //lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Do not have access token" });
    }
    const token = authHeader.split(" ")[1];

    //verify token
    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);

    const userId = decoded.userId;

    //kiêm tra token có tồn tại không
    if (!userId) {
      return res.status(401).json({ message: "Do not have access token" });
    }

    //tìm user từ token
    const user = await User.findById(userId).select("-hashPassword");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //gắn user vào body để các controller có thể sử dụng
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access token expired",
        code: "TOKEN_EXPIRED",
      });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
