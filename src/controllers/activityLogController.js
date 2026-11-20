import mongoose from "mongoose";

import ActivityLog from "#models/ActivityLog.js";
import { senderPipeline } from "#utils/buildMessagePipeline.js";

export const getAllActivityLogs = async (req, res) => {
  try {
    const notificationId = req.params.notificationId;

    const filter = {
      notificationId: new mongoose.Types.ObjectId(notificationId),
    };

    const activityLogs = await ActivityLog.aggregate([
      {
        $match: filter,
      },
      ...senderPipeline,
    ]);

    res.status(200).json(activityLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
