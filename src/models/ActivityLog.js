import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "system",
      "mention",
      "reply",
      "reaction",
      "new_message",
      "received-request",
    ],
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // ID to link the activity to a specific entity (e.g., message, thread, etc.)
  idToLink: {
    type: String,
  },
  createdAt: { type: Date, default: Date.now },
});

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;
