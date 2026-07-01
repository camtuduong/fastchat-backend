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

export const uploadAvatar = async (req, res) => {};

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
