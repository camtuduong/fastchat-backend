import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
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
    const cursor = req.query.cursor;

    const filter = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
    };

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

    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.userId": req.user._id,
    });

    if (cursor) {
      filter.createdAt = { $lt: new Date(cursor) };
    }

    if (conversation) {
      const participant = conversation.participants.find(
        (p) => p.userId.toString() === req.user._id.toString(),
      );

      if (participant.clearedAt) {
        filter.createdAt = {
          ...filter.createdAt,
          $gt: participant.clearedAt,
        };
      }
    }

    const messages = await Message.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $limit: 40 },
      {
        $lookup: {
          from: "users",
          localField: "sender.userId",
          foreignField: "_id",
          as: "_senderUser",
        },
      },
      {
        $addFields: {
          "sender.avatarUrl": { $arrayElemAt: ["$_senderUser.avatarUrl", 0] },
          "sender.displayName": {
            $arrayElemAt: ["$_senderUser.displayName", 0],
          },
        },
      },
      { $project: { _senderUser: 0 } },
    ]);

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
    const filter = {
      participants: {
        $elemMatch: {
          userId: req.user._id,
          hidden: { $ne: true },
        },
      },
    };

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

    if (type === "group" && participants.length <= 1) {
      return res.status(400).json({
        message: "A group conversation must have at least 2 participants",
      });
    }

    //kiểm tra xem đã có cuộc trò chuyện giữa các thành viên trong DB chưa
    let isExistingConversation;

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

    if (isExistingConversation) {
      return res.status(400).json({
        message: "Conversation already exists",
        conversation: isExistingConversation._id,
      });
    }

    //cần add thêm username của các thành viên vào participants để hiển thị tên người dùng trong cuộc trò chuyện
    const participantsWithUsernames = await Promise.all(
      participants.map(async (userId) => {
        const user = await User.findById(userId);
        if (!user) {
          throw new Error(`User with ID ${userId} not found`);
        }
        return { userId, username: user.username, joinedAt: new Date() };
      }),
    );

    const newConversation = await Conversation.create({
      type,
      participants: [
        { userId: senderId, username: req.user.username, joinedAt: new Date() },
        ...participantsWithUsernames,
      ],
      group: {
        name: type === "group" ? req.body.groupName : undefined,
        createdAt: new Date(),
        createdBy: senderId,
      },
    });

    return res.status(200).json({
      message: "Conversation created successfully",
      conversation: newConversation._id,
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
    await Conversation.updateOne(
      { _id: conversationId },
      {
        $addToSet: { seenBy: senderId },
        $set: { [`unreadCount.${senderId}`]: 0 },
      },
    );

    return res.status(200).json({ message: "Conversation marked as seen" });
  } catch (error) {
    console.error("Error marking conversation as seen:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getConversationById = async function (req, res) {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation Id is required" });
    }

    const isMember = await Conversation.exists({
      _id: conversationId,
      "participants.userId": userId,
    });

    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this conversation" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    return res.status(200).json({ conversation });
  } catch (error) {
    console.error("Error fetching conversation by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserConversationsForSocket = async function (userId) {
  try {
    const conversations = await Conversation.find(
      {
        "participants.userId": userId,
      },
      { _id: 1 },
    );

    return conversations.map((conversation) => conversation._id.toString());
  } catch (error) {
    console.error("Error fetching user conversations for socket:", error);
    throw new Error("Internal server error");
  }
};

export const removeConversationForMe = async function (req, res) {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation Id is required" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.userId": req.user._id,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ message: "Conversation not found or you are not a member" });
    }

    // Cập nhật trạng thái ẩn và thời gian xóa cho người dùng hiện tại
    await Conversation.updateOne(
      { _id: conversationId, "participants.userId": req.user._id },
      {
        $set: {
          "participants.$.hidden": true,
          "participants.$.clearedAt": new Date(),
        },
      },
    );

    return res.status(200).json({ message: "Conversation deleted for user" });
  } catch (error) {
    console.error("Error deleting conversation for user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
