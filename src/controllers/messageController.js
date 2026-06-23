import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { updateConversationAfterCreateMessage } from "../utils/messageHelper.js";

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
    const { conversationId, receiverId, content, attachments } = req.body;
    //sender là user đang đăng nhập
    const senderId = req.user._id;

    //tìm kiếm conversation giữa sender và receiver
    let conversation;

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        type: "direct",
      });
    }

    //nếu content hoặc attachments rỗng thì trả về lỗi
    if (!content && (!attachments || attachments.length === 0)) {
      return res
        .status(400)
        .json({ message: "Content or attachments are required" });
    }

    if (!conversation) {
      //nếu không có conversation thì tạo mới
      conversation = await Conversation.create({
        type: "direct",
        participants: [
          { userId: senderId, joinedAt: new Date() },
          { userId: receiverId, joinedAt: new Date() },
        ],
        lastMessageAt: new Date(),
        unreadCount: new Map(),
      });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);

    //lưu lại tất cả thay đổi
    await conversation.save();

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
    const { conversationId, content, attachments } = req.body;
    const senderId = req.user._id;

    // kiểm tra conversationId và content có tồn tại không
    if (!conversationId) {
      return res.status(400).json({ message: "Conversation Id is required" });
    }

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: "Content are required" });
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

    const message = await Message.create({
      conversationId: conversation._id,
      senderId,
      content,
    });

    updateConversationAfterCreateMessage(conversation, message, senderId);
    await conversation.save();

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
