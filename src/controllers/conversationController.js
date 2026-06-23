import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { getNextCursor } from "../utils/paginationHelper.js";

/* 
    =============Lấy tin nhắn trong cuộc trò chuyện================
    - Kiểm tra xem conversationId có tồn tại không?
    - Kiểm tra xem người dùng có phải là thành viên của cuộc trò chuyện không?
    - Nếu có thì lấy tất cả tin nhắn trong cuộc trò chuyện đó và trả về
    - Nếu không thì trả về lỗi
*/
export const getMessagesInConversation = async function (req, res) {
  try {
    const { conversationId } = req.params;
    const { cursor } = req.query;
    const filter = { conversationId };

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation Id is required" });
    }

    const isMember = await Conversation.exists({
      _id: conversationId,
      "participants.userId": req.user._id,
    });

    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this conversation" });
    }

    if (cursor) {
      filter.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(20);

    const nextCursor = getNextCursor(messages, "createdAt");

    return res.status(200).json({ messages, nextCursor });
  } catch (error) {
    console.error("Error fetching messages in conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllConversations = async function (req, res) {
  try {
    const { cursor } = req.query;
    const filter = { "participants.userId": req.user._id };

    if (cursor) {
      filter.lastMessageAt = { $lt: new Date(cursor) };
    }

    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(20);

    const nextCursor = getNextCursor(conversations, "lastMessageAt");

    return res.status(200).json({ conversations, nextCursor });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* 
    ============Tạo cuộc trò chuyện mới===========
    - Kiểm tra dữ liệu đầu vào có hợp lệ không
    - Kiểm tra xem cuộc trò chuyện đã tồn tại chưa?
    - Nếu có rồi thì trả về id để FE chuyển hướng sang cuộc trò chuyện đó
    - Nếu chưa thì tạo cuộc trò chuyện mới và trả về id
*/
export const createNewConversation = async function (req, res) {
  try {
    const senderId = req.user._id;
    const { type, participants } = req.body;

    //kiểm tra xem type và participants có hợp lệ không
    if (!type) {
      return res.status(400).json({ message: "Type is required" });
    }

    if (!["direct", "group"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Type must be either 'direct' or 'group'" });
    }

    if (!participants || participants.length === 0) {
      return res.status(400).json({ message: "Participants are required" });
    }

    //kiểm tra xem đã có cuộc trò chuyện giữa các thành viên trong DB chưa
    let isExistingConversation;

    const x = await Conversation.findOne({
      type: "direct",
      "participants.userId": { $all: [senderId, participants[0]] },
    });

    console.log("x:", x);
    if (type === "direct" && participants.length === 1) {
      isExistingConversation = await Conversation.findOne({
        type: "direct",
        "participants.userId": { $all: [senderId, participants[0]] },
      });
    } else if (type === "group" && participants.length >= 1) {
      isExistingConversation = await Conversation.findOne({
        type: "group",
        "participants.userId": { $all: [senderId, ...participants] },
      });
    }

    console.log("isExistingConversation:", isExistingConversation);

    if (isExistingConversation) {
      return res.status(400).json({
        message: "Conversation already exists",
        conversation: isExistingConversation._id,
      });
    }

    const newConversation = await Conversation.create({
      type,
      participants: [
        { userId: senderId, joinedAt: new Date() },
        ...participants.map((userId) => ({ userId, joinedAt: new Date() })),
      ],
    });

    return res.status(200).json({
      message: "Conversation created successfully",
      conversationId: newConversation._id,
    });
  } catch (error) {
    console.error("Error creating new conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const seenConversation = async function (req, res) {
  try {
    const { conversationId } = req.params;
    const senderId = req.user._id;

    let conversation;

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        "participants.userId": senderId,
      });
    }

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    //cập nhật trạng thái đã xem của cuộc trò chuyện
    conversation.set({
      seenBy: [senderId],
      unreadCount: { [senderId]: 0 }, // Reset unread count for the user
    });

    await conversation.save();

    return res.status(200).json({ message: "Conversation marked as seen" });
  } catch (error) {
    console.error("Error marking conversation as seen:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
