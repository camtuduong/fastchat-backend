import User from "../models/User.js";

export const authMe = async (req, res) => {
  try {
    return res
      .status(200)
      .json({ message: "Authenticated user", user: req.user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
