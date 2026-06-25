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
