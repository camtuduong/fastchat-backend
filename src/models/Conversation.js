import mongoose from "mongoose";

const participantsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    displayName: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    clearedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    groupAvatarUrl: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const pinnedMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pinnedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const lastMessageSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
    }, //id của tin nhắn gốc, không phải id của tin nhắn đã được chỉnh sửa
    content: {
      type: String,
      default: "",
    },
    sender: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      avatarUrl: {
        type: String,
        trim: true,
      },
      displayName: {
        type: String,
        trim: true,
      },
    },
    createdAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
    },
    //người tham gia cuộc trò chuyện, bao gồm cả người tạo và người được mời
    participants: {
      type: [participantsSchema],
      required: true,
    },
    group: {
      type: groupSchema,
    },
    lastMessageAt: {
      type: Date,
    },
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastMessage: {
      type: lastMessageSchema,
      trim: true,
    },

    //pinnedMessages lưu trữ các tin nhắn đã được ghim trong cuộc trò chuyện, bao gồm cả thông tin về người ghim và thời gian ghim
    pinnedMessages: [
      {
        type: pinnedMessageSchema,
      },
    ],
    // Lưu số lượng tin nhắn chưa đọc cho mỗi người tham giaadd
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    favoriteBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);
conversationSchema.index({ "participants.userId": 1, lastMessageAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
