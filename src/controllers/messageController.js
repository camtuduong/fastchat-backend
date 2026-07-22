import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { buildMessagePipeline } from "../utils/buildMessagePipeline.js";
import {
  emitDeleteMessage,
  emitNewMessage,
  updateConversationAfterCreateMessage,
  updateConversationAfterDeleteMessage,
} from "../utils/messageHelper.js";

const MAX_CONTENT_LENGTH = 10000; // Độ dài tối đa của content

// Lấy instance của Socket.IO từ socket/index.js
/*
  =============Gửi tin nhắn tới 1 cá nhân(1-1)================
  - Kiểm tra xem conversationId có tồn tại không?
  - Kiểm tra xem content có rỗng không?
  - Nếu ConversationId không tồn tại (cả 2 chưa từng nhắn tin cho nhau) thì tạo 1 conversation mới
  =============Pass kiểm tra================
  - Tạo tin nhắn mới
  - Cập nhật lại thông tin Coversation
  - Lưu lại tất cả thay đổi
  - Trả về kết quả thành công
*/
export const sendDirectMessage = async (req, res) => {
  try {
    const { conversationId, receiverId, content, attachments, replyTo } =
      req.body;
    //sender là user đang đăng nhập
    const senderId = req.user._id;
    const io = req.app.get("io");

    if (!receiverId && !conversationId) {
      return res
        .status(400)
        .json({ message: "ReceiverId or ConversationId is required" });
    }

    //nếu content hoặc attachments rỗng thì trả về lỗi
    if (!content && (!attachments || attachments.length === 0)) {
      return res
        .status(400)
        .json({ message: "Content or attachments are required" });
    }

    if (content && content.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({
        message: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
      });
    }

    let conversation;

    //nếu có conversationId thì tìm kiếm conversation trong DB
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        type: "direct",
      });
    }

    //nếu không tìm thấy conversation và không có receiverId thì trả về lỗi
    if (!conversation && !receiverId) {
      return res
        .status(404)
        .json({ message: "Conversation not found, please create a new one" });
    }

    if (receiverId && !conversation) {
      const receiver = await User.findById(receiverId);

      if (!receiver) {
        return res.status(404).json({ message: "Receiver not found" });
      } else {
        conversation = await Conversation.findOne({
          type: "direct",
          "participants.userId": { $all: [senderId, receiver._id] },
        });
      }

      //nếu không tìm thấy conversation và có receiverId thì tạo mới
      if (!conversation && receiverId) {
        conversation = await Conversation.create({
          type: "direct",
          participants: [
            {
              userId: senderId,
              joinedAt: new Date(),
              username: req.user.username,
            },
            {
              userId: receiverId,
              joinedAt: new Date(),
              username: receiver.username,
            },
          ],
          lastMessageAt: new Date(),
          unreadCount: new Map(),
        });
      }
    }

    let replyMessage = null;

    if (replyTo) {
      replyMessage = await Message.findOne({
        _id: replyTo,
        conversationId: conversation._id,
      });

      if (!replyMessage) {
        return res.status(404).json({
          message: "Reply message not found",
        });
      }
    }

    const createdMessage = await Message.create({
      conversationId: conversation._id,
      sender: {
        userId: senderId,
      },
      content,
      attachments,
      replyTo: replyTo ?? null,
    });

    updateConversationAfterCreateMessage(
      conversation,
      createdMessage,
      senderId,
    );

    //lưu lại tất cả thay đổi
    await conversation.save();

    // Lấy message đầy đủ (sender + replyTo)
    const [message] = await Message.aggregate(
      buildMessagePipeline(
        {
          _id: createdMessage._id,
        },
        1,
      ),
    );

    emitNewMessage(io, conversation, message);
    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/*
  =============Gửi tin nhắn nhóm================
  - Kiểm tra xem conversationId có tồn tại không?
  - Kiểm tra xem sender có phải là thành viên của nhóm không?
  - Kiểm tra xem content có rỗng không?
  =============Pass kiểm tra================
  - Tạo tin nhắn mới
  - Cập nhật lại thông tin Coversation
  - Lưu lại tất cả thay đổi
  - Trả về kết quả thành công
*/
export const sendGroupMessage = async (req, res) => {
  try {
    const { conversationId, content, attachments, replyTo } = req.body;
    const senderId = req.user._id;
    const io = req.app.get("io");

    // kiểm tra conversationId và content có tồn tại không
    if (!conversationId) {
      return res.status(400).json({ message: "Conversation Id is required" });
    }

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: "Content are required" });
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({
        message: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
      });
    }

    let conversation;

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        type: "group",
      });
    }

    if (!conversation) {
      return res.status(404).json({ message: "Group conversation not found" });
    }

    const isMemberInGroup = await Conversation.exists({
      _id: conversationId,
      "participants.userId": senderId,
    });

    if (!isMemberInGroup) {
      return res
        .status(403)
        .json({ message: "You are not a member of this group" });
    }

    let replyMessage = null;

    if (replyTo && isMemberInGroup) {
      replyMessage = await Message.findOne({
        _id: replyTo,
        conversationId: conversation._id,
      });

      if (!replyMessage) {
        return res.status(404).json({
          message: "Reply message not found",
        });
      }
    }

    const createdMessage = await Message.create({
      conversationId: conversation._id,
      sender: {
        userId: senderId,
        displayName: req.user.displayName,
        avatarUrl: req.user.avatarUrl,
      },
      content,
      attachments,
      replyTo: replyTo ?? null,
    });

    updateConversationAfterCreateMessage(
      conversation,
      createdMessage,
      senderId,
    );
    await conversation.save();

    // Lấy message đầy đủ (sender + replyTo)
    const [message] = await Message.aggregate(
      buildMessagePipeline(
        {
          _id: createdMessage._id,
        },
        1,
      ),
    );
    emitNewMessage(io, conversation, message);

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMessageWithEveryOne = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    const io = req.app.get("io");

    if (!messageId) {
      return res.status(400).json({ message: "Message Id is required" });
    }

    const message = await Message.findOne({
      _id: messageId,
      "sender.userId": userId,
    });

    const conversation = await Conversation.findById(message.conversationId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this message" });
    }

    await Message.findByIdAndDelete(messageId);

    const newLatestMessage = await Message.findOne({
      conversationId: message.conversationId,
    }).sort({ createdAt: -1 });

    const isDeletingLastMessage =
      conversation.lastMessage._id.toString() === messageId.toString();

    updateConversationAfterDeleteMessage(
      conversation,
      messageId,
      newLatestMessage,
    );
    await conversation.save();

    emitDeleteMessage(
      io,
      conversation,
      messageId,
      newLatestMessage,
      isDeletingLastMessage,
    );

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
