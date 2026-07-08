import mongoose from "mongoose";

const senderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: mongoose.Schema.Types.String,
      ref: "User",
    },
  },
  {
    _id: false,
  },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: senderSchema,
      required: true,
    },
    content: { type: String, trim: true, maxlength: 10000 },
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "video", "file"],
          required: true,
        },
        url: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
