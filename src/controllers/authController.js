import bcrypt from "bcrypt";
import User from "../models/User.js";
import Session from "../models/Session.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../server.js";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = 14 * 24 * 60 * 60 * 1000; //14 ngay
const DEVICE_ID_EXPIRES_IN = 365 * 24 * 60 * 60 * 1000; //1 nam

/* 
  =============Đăng ký tài khoản================
  - Kiểm tra xem tất cả các trường đều được cung cấp không?
  - Kiểm tra xem username hoặc email đã tồn tại chưa?
  - Mã hóa mật khẩu
  - Tạo người dùng mới
  - Trả về kết quả thành công
*/
export const signUp = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    //kiem tra du lieu dau vao
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    //kiem tra username va email da ton tai chua
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    //ma hoa password
    const hashPassword = await bcrypt.hash(password, 10); //saltRounds = 10 so lan ma hoa password

    //tao user moi
    await User.create({
      username,
      email,
      hashPassword,
      displayName: `${firstName} ${lastName}`,
    });

    return res.sendStatus(204); //204 No Content
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* 
  =============Đăng nhập tài khoản================
  - Kiểm tra xem tất cả các trường đều được cung cấp không?
  - Kiểm tra xem username hoặc email đã tồn tại chưa?
  - Mã hóa mật khẩu
  - Kiểm tra mật khẩu có chính xác không?
  - Lấy deviceId từ header, nếu không có thì tạo mới
  - Tìm và kiểm tra xem có session nào hợp lệ cho userId và deviceId này không?
  - Nếu có session hợp lệ thì thu hồi session cũ
  - Tạo access token
  - Tạo refresh token và lưu vào database
  - Trả về refresh token vào cookies
  - Trả về kết quả thành công và access token trong body
*/
export const signIn = async (req, res) => {
  try {
    const { username, password } = req.body;

    //kiem tra du lieu dau vao
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    //kiem tra username co ton tai khong
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(401)
        .json({ message: "Username or password is incorrect" });
    }

    //kiem tra password co chinh xac khong
    const isPasswordValid = await bcrypt.compare(password, user.hashPassword);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Username or password is incorrect" });
    }

    //lay deviceId tu header, neu khong co thi tao moi
    let deviceId = req.cookies.deviceId;
    if (!deviceId) {
      deviceId = crypto.randomUUID();
    }

    //tim và kiểm tra xem có session nào hợp lệ cho userId và deviceId này không
    const oldSession = await Session.findOne({
      userId: user._id,
      deviceId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (oldSession) {
      oldSession.revokedAt = new Date(); //thu hoi session cu
      oldSession.revokeReason = "New sign in"; //ly do thu hoi session cu
      await oldSession.save();
    }

    //tao token
    const accessToken = jwt.sign(
      { userId: user._id },
      env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      },
    );

    //tao refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    //luu refresh token vao database
    await Session.create({
      userId: user._id,
      deviceId,
      refreshToken: refreshTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN),
      revokedAt: null,
      revokeReason: null,
    });

    //tra ve refresh token vao cookies
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_EXPIRES_IN,
    });

    res.cookie("deviceId", deviceId, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: DEVICE_ID_EXPIRES_IN,
    });

    return res.json({ message: "Sign in successful", accessToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* 
  =============Đăng Xuất tài khoản================
  - Lấy userId từ req.user và deviceId từ cookies
  - Kiểm tra xem userId có tồn tại không?
  - Nếu deviceId tồn tại thì tìm session tương ứng và thu hồi session đó
  - Xóa refresh token và deviceId khỏi cookies
  - Trả về kết quả thành công
*/
export const signOut = async (req, res) => {
  try {
    const userId = req.user?._id;
    const deviceId = req.cookies.deviceId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (deviceId) {
      await Session.updateOne(
        {
          userId,
          deviceId,
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        },
        {
          revokedAt: new Date(),
          revokeReason: "User sign out",
        },
      );
    }

    //tim session và thu hồi session
    const session = await Session.findOne({
      userId,
      deviceId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (session) {
      session.revokedAt = new Date();
      session.revokeReason = "User sign out";
      await session.save();
    }

    //xoa refresh token va deviceId khoi cookies
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.clearCookie("deviceId", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.status(200).json({ message: "Sign out successful" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const deviceId = req.cookies.deviceId;

    if (!refreshToken || !deviceId) {
      return res
        .status(401)
        .json({ message: "Refresh token or deviceId is missing" });
    }

    //Tìm session tương ứng với refresh token và deviceId
    const session = await Session.findOne({
      deviceId,
      revokedAt: null,
      expiresAt: { $gt: new Date() }, //lọc session lớn hơn thời điểm hiện tại
    });

    if (!session) {
      return res.status(401).json({ message: "Session not found or expired" });
    }

    console.log("session", session);

    //tạo access token mới
    const newAccessToken = jwt.sign(
      { userId: session.userId },
      env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      },
    );
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.log("refreshToken error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
