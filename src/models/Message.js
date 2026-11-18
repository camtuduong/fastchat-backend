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
    // The main content of the message
    content: { type: String, maxlength: MAX_CONTENT_LENGTH },
    // The structured content of the message in JSON format
    contentJson: { type: mongoose.Schema.Types.Mixed, default: null },
    mentionedUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "video", "file", "sticker"],
          required: true,
        },
        url: { type: String, required: true },
        id: { type: String, required: true },
        name: { type: String, required: true },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
    system: {
      action: {
        type: String,
        enum: [
          "create_group",
          "rename_group",
          "change_group_avatar",
          "add_member",
          "share_conversation",
          "remove_member",
          "leave_group",
          "pin_message",
          "unpin_message",
        ],
      },

      metadata: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, mentionedUserIds: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
