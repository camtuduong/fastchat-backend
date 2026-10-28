import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const notifications = await Notification.find({ ownerId });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error(error);
  }
};
