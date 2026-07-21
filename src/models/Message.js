import mongoose from "mongoose";

const MAX_CONTENT_LENGTH = 10000;

const senderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const replySchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    content: { type: String, trim: true, maxlength: MAX_CONTENT_LENGTH },
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "video", "file"],
          required: true,
        },
        url: { type: String, required: true },
        id: { type: String, required: true },
        name: { type: String, required: true },
      },
    ],
  },
  { _id: false },
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
    content: { type: String, trim: true, maxlength: MAX_CONTENT_LENGTH },
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "video", "file"],
          required: true,
        },
        url: { type: String, required: true },
        id: { type: String, required: true },
        name: { type: String, required: true },
      },
    ],
    replyTo: {
      type: replySchema,
      default: null,
    },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
