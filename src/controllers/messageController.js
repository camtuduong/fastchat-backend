import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { buildMessagePipeline } from "../utils/buildMessagePipeline.js";
import {
  emitDeleteMessage,
  emitNewMessage,
  emitPinnedMessage,
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

//new flow khi accept rq thì tạo luôn conversation hoặc tạo bằng cách tìm kiếm và tạo
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, attachments, replyTo } = req.body;
    //sender là user đang đăng nhập
    const senderId = req.user._id;
    const io = req.app.get("io");

    if (!conversationId) {
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
      conversation = await Conversation.findById(conversationId);
    }

    //nếu không tìm thấy conversation thì trả về lỗi
    if (!conversation) {
      return res
        .status(404)
        .json({ message: "Conversation not found, please create a new one" });
    }

    //kiểm tra xem sender có phải là thành viên của conversation không
    const isMemberInGroup = conversation.participants.some(
      (participant) => participant.userId.toString() === senderId.toString(),
    );
    if (!isMemberInGroup) {
      return res
        .status(403)
        .json({ message: "You are not a member of this conversation" });
    }

    let replyMessage = null;

    if (replyTo && isMemberInGroup) {
      replyMessage = await Message.findOne({
        _id: replyTo,
        conversationId: conversation._id,
      });

      if (!replyMessage) {
        return res.status(404).json({
          message: "Message to Reply not found",
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

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (message.sender.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this message" });
    }

    await Message.findByIdAndDelete(messageId);

    // Cập nhật các tin nhắn trả lời (replyTo) của tin nhắn bị xóa thành null
    await Message.updateMany(
      { replyTo: messageId },
      { $set: { replyTo: null } },
    );

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

export const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const io = req.app.get("io");

    if (!messageId) {
      return res.status(400).json({ message: "Message Id is required" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    message.isPin = true;
    await message.save();

    console.log("Pinned message:", message);

    emitPinnedMessage(io, message.conversationId, message);
    res.status(200).json({ message: "Message pinned successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
