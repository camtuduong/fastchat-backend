import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  unReadCount: {
    type: Number,
    default: 0,
  },
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
