import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import User from "../models/User.js";
import { normalizeText } from "../utils/normalizeText.js";

export const getMe = async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfile = async (req, res) => {};

export const uploadAvatar = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user._id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload the image to Cloudinary
    const result = await uploadImageFromBuffer(file.buffer, {
      folder: "fastchat/avatars",
      resource_type: "image",
      transformation: [{ width: 200, height: 200, crop: "fill" }],
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatarUrl: result.secure_url, avatarId: result.public_id },
      { new: true },
    ).select("avatarUrl");

    if (!updatedUser.avatarUrl) {
      return res.status(400).json({ message: "Avatar is null" });
    }

    return res.status(200).json({ avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const findUserBySearch = async (req, res) => {
  try {
    const search = req.query.search;
    if (!search) {
      return res.status(200).json({ users: [] });
    }
    const normalizedSearch = normalizeText(search);
    const users = await User.find({
      $or: [
        { username: { $regex: normalizedSearch, $options: "i" } },
        { email: { $regex: normalizedSearch, $options: "i" } },
        { displayName: { $regex: normalizedSearch, $options: "i" } },
      ],
      _id: { $ne: req.user._id },
    }).select("username displayName avatarUrl");

    return res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select(
      "username displayName avatarUrl",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
