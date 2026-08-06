import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { getNextCursor } from "../utils/paginationHelper.js";
import { buildMessagePipeline } from "../utils/buildMessagePipeline.js";
import { onlineUsers } from "../socket/index.js";
import {
  emitNewMessage,
  emitPinMessage,
  emitUnpinnedMessage,
} from "../utils/messageHelper.js";
import { buildConversationPipeline } from "../utils/buildConversationPipeline.js";
import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import {
  emitAddMember,
  emitRemoveMember,
  emitUpdateGroupAvatar,
  emitUpdateGroupName,
} from "../utils/conversationHelper.js";

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

    const messages = await Message.aggregate(buildMessagePipeline(filter, 40));

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

    const conversations = await Conversation.aggregate([
      {
        $match: filter,
      },
      {
        $addFields: {
          isFavorite: {
            $in: [req.user._id, { $ifNull: ["$favoriteBy", []] }],
          },
        },
      },
      {
        $sort: {
          isFavorite: -1,
          lastMessageAt: -1,
        },
      },
      {
        $limit: 20,
      },
      {
        $project: {
          favoriteBy: 0,
        },
      },
    ]);

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
    const io = req.app.get("io");

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
        "participants.userId": {
          $all: [senderId, participants[0]],
        },
        participants: { $size: 2 },
      });
    }

    if (isExistingConversation) {
      return res.status(200).json({
        message: "Conversation already exists",
        conversation: isExistingConversation._id,
      });
    }

    const users = await User.find({
      _id: { $in: participants },
    })
      .select("displayName avatarUrl")
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const participantsWithUsernames = participants.map((id) => {
      const user = userMap.get(id.toString());

      if (!user) {
        throw new Error(`User ${id} not found`);
      }

      return {
        userId: id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        joinedAt: new Date(),
      };
    });

    const newConversation = await Conversation.create({
      type,
      participants: [
        {
          userId: senderId,
          displayName: req.user.displayName,
          avatarUrl: req.user.avatarUrl,
          joinedAt: new Date(),
        },
        ...participantsWithUsernames,
      ],
      group: {
        name: type === "group" ? req.body.groupName : undefined,
        createdAt: new Date(),
        createdBy: type === "group" ? req.user._id : undefined,
      },
    });

    const conversationId = newConversation._id.toString();

    for (const participant of newConversation.participants) {
      const socketIds = onlineUsers.get(participant.userId.toString());

      if (!socketIds) continue;

      for (const socketId of socketIds) {
        io.sockets.sockets.get(socketId)?.join(conversationId);
      }
    }

    if (type === "group") {
      const systemMessage = new Message({
        conversationId: newConversation._id,
        content: `<b>${req.user.displayName}</b> has created the group</b>`,
        sender: {
          userId: req.user._id,
        },
        system: {
          action: "create_group",
          groupName: req.body.groupName,
        },
        createdAt: new Date(),
      });
      await systemMessage.save();

      emitNewMessage(io, newConversation, systemMessage);
    }
    return res.status(200).json({
      message: "Conversation created successfully",
      conversation: newConversation._id,
    });
  } catch (error) {
    console.error("Error creating new conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addNewMembersToConversation = async function (req, res) {
  try {
    const { conversationId } = req.params;
    const { memberIds } = req.body; // newMemberId should be an array
    const io = req.app.get("io");

    if (
      !conversationId ||
      !memberIds ||
      !Array.isArray(memberIds) ||
      memberIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Conversation Id and Member Ids are required" });
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

    const isUsers = await User.find({ _id: { $in: memberIds } });

    if (isUsers.length !== memberIds.length) {
      return res.status(404).json({ message: "One or more users not found" });
    }

    const alreadyMemberIds = conversation.participants.map((p) =>
      p.userId.toString(),
    );

    const newMembersToAdd = memberIds.filter(
      (id) => !alreadyMemberIds.includes(id),
    );

    if (newMembersToAdd.length === 0) {
      return res.status(400).json({
        message: "All users are already members of this conversation",
      });
    }

    const users = await User.find({
      _id: { $in: newMembersToAdd },
    })
      .select("displayName avatarUrl")
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const participantsWithUsernames = newMembersToAdd.map((id) => {
      const user = userMap.get(id.toString());

      if (!user) {
        throw new Error(`User ${id} not found`);
      }

      return {
        userId: id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        joinedAt: new Date(),
      };
    });

    conversation.participants.push(...participantsWithUsernames);
    await conversation.save();

    const systemMessage = new Message({
      conversationId: conversation._id,
      content: `<b>${req.user.displayName}</b> has added <b>${participantsWithUsernames.map((p) => p.displayName).join(", ")}</b> to the conversation`,
      sender: {
        userId: req.user._id,
      },
      system: {
        action: "add_member",
        newMemberIds: newMembersToAdd,
      },
      createdAt: new Date(),
    });
    await systemMessage.save();

    emitNewMessage(io, conversation, systemMessage);
    emitAddMember(io, conversation._id, newMembersToAdd);

    return res.status(200).json({
      message: "New member added successfully",
      conversation: conversation._id,
    });
  } catch (error) {
    console.error("Error adding new member to conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeMemberFromConversation = async function (req, res) {
  try {
    const { conversationId } = req.params;
    const { memberId } = req.params;
    const io = req.app.get("io");

    if (!conversationId || !memberId) {
      return res
        .status(400)
        .json({ message: "Conversation Id and Member Id are required" });
    }

    //kiểm tra xem cuộc trò chuyện có tồn tại và người dùng hiện tại có phải là thành viên không
    const conversation = await Conversation.findOne({
      _id: conversationId,
      type: "group",
      "group.createdBy": req.user._id,
      "participants.userId": req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        message:
          "Conversation not found or you are not a member or not the creator",
      });
    }

    const isMember = conversation.participants.some(
      (p) => p.userId.toString() === memberId,
    );

    if (!isMember) {
      return res
        .status(404)
        .json({ message: "Member not found in the conversation" });
    }

    if (memberId.toString() === conversation.group.createdBy.toString()) {
      return res
        .status(400)
        .json({ message: "Cannot remove the group creator" });
    }

    const systemMessage = new Message({
      conversationId: conversation._id,
      content: `<b>${req.user.displayName}</b> has removed <b>${conversation.participants.find((p) => p.userId.toString() === memberId)?.displayName}</b> from the conversation`,
      sender: {
        userId: req.user._id,
      },
      system: {
        action: "remove_member",
        removedMemberId: memberId,
      },
      createdAt: new Date(),
    });

    conversation.participants = conversation.participants.filter(
      (p) => p.userId.toString() !== memberId,
    );
    await conversation.save();
    await systemMessage.save();
    emitNewMessage(io, conversation, systemMessage);
    emitRemoveMember(io, conversation._id, memberId);

    res.status(200).json({
      message: "Member removed successfully",
      conversation: conversation._id,
    });
  } catch (error) {
    console.error("Error removing member from conversation:", error);
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

    const filter = {
      _id: new mongoose.Types.ObjectId(conversationId),
    };

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

    const conversation = await Conversation.aggregate(
      buildConversationPipeline(filter, userId),
    );
    if (!conversation || conversation.length === 0) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const conversationData = conversation[0];

    return res.status(200).json({ conversation: conversationData });
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

export const addPinnedMessageInConversation = async function (req, res) {
  try {
    const { conversationId } = req.params;
    const { messageId } = req.body;
    const io = req.app.get("io");

    if (!conversationId || !messageId) {
      return res
        .status(400)
        .json({ message: "Conversation Id and Message Id are required" });
    }

    //tìm conversation và kiểm tra xem người dùng có phải là thành viên không
    const conversation = await Conversation.findOne({
      _id: conversationId,
      "participants.userId": req.user._id,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ message: "Conversation not found or you are not a member" });
    }

    const message = await Message.findOne({
      _id: messageId,
      conversationId: conversationId,
    });

    if (!message) {
      return res
        .status(404)
        .json({ message: "Message not found in this conversation" });
    }

    if (
      conversation.pinnedMessages.some(
        (pinned) => pinned.messageId.toString() === messageId,
      )
    ) {
      return res.status(400).json({ message: "Message is already pinned" });
    }

    //thêm message vào danh sách pinnedMessages của conversation
    await Conversation.updateOne(
      { _id: conversationId },
      {
        $push: {
          pinnedMessages: {
            messageId: message._id,
            pinnedBy: req.user._id,
            pinnedAt: new Date(),
          },
        },
      },
    );

    const systemMessage = new Message({
      conversationId: conversationId,
      content: `<b>${req.user.displayName}</b> has <i>pinned</i> a message`,
      sender: {
        userId: req.user._id,
      },
      system: {
        action: "pin_message",
        messageId: message._id,
      },
      createdAt: new Date(),
    });
    await systemMessage.save();

    emitPinMessage(io, conversation, systemMessage);

    res.status(200).json({ message: "Message pinned successfully" });
  } catch (error) {
    console.error("Error adding pinned message in conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unpinnedMessageInConversation = async function (req, res) {
  try {
    const { conversationId } = req.params;
    const { messageId } = req.params;
    const io = req.app.get("io");

    if (!conversationId || !messageId) {
      return res
        .status(400)
        .json({ message: "Conversation Id and Message Id are required" });
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

    const isExistPinnedMessageId = conversation.pinnedMessages.find(
      (pinned) => pinned.messageId.toString() === messageId,
    );

    if (!isExistPinnedMessageId) {
      return res
        .status(404)
        .json({ message: "Pinned message not found in this conversation" });
    }

    await Conversation.updateOne(
      { _id: conversationId },
      {
        $pull: {
          pinnedMessages: {
            messageId: new mongoose.Types.ObjectId(messageId),
          },
        },
      },
    );

    emitUnpinnedMessage(io, conversation._id);

    res.status(200).json({ message: "Message unpinned successfully" });
  } catch (error) {
    console.error("Error unpinning message in conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const uploadGroupAvatar = async function (req, res) {
  try {
    const file = req.file;
    const { conversationId } = req.params;
    const io = req.app.get("io");

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation Id is required" });
    }

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      type: "group",
      "participants.userId": req.user._id,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ message: "Conversation not found or you are not a member" });
    }

    // Upload the image to Cloudinary
    const result = await uploadImageFromBuffer(file.buffer, {
      folder: "fastchat/group_avatars",
      resource_type: "image",
      transformation: [{ width: 200, height: 200, crop: "fill" }],
    });

    conversation.group.groupAvatarUrl = result.secure_url;
    await conversation.save();

    const systemMessage = new Message({
      conversationId: conversation._id,
      content: `<b>${req.user.displayName}</b> has changed the group avatar`,
      sender: {
        userId: req.user._id,
      },
      system: {
        action: "change_group_avatar",
        groupAvatarUrl: result.secure_url,
      },
      createdAt: new Date(),
    });
    await systemMessage.save();

    emitNewMessage(io, conversation, systemMessage);
    emitUpdateGroupAvatar(io, conversation._id, result.secure_url);

    return res.status(200).json({ groupAvatarUrl: result.secure_url });
  } catch (error) {
    console.error("Error uploading group avatar:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateGroupName = async function (req, res) {
  try {
    const { conversationId } = req.params;
    const { groupName } = req.body;
    const io = req.app.get("io");

    if (!conversationId || !groupName) {
      return res
        .status(400)
        .json({ message: "Conversation Id and Group Name are required" });
    }

    if (groupName.length > 100) {
      return res
        .status(400)
        .json({ message: "Group Name must be less than 100 characters" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      type: "group",
      "participants.userId": req.user._id,
    });

    if (!conversation) {
      return res
        .status(404)
        .json({ message: "Conversation not found or you are not a member" });
    }

    conversation.group.name = groupName;
    await conversation.save();

    const systemMessage = new Message({
      conversationId: conversation._id,
      content: `<b>${req.user.displayName}</b> has changed the group name to <b>${groupName}</b>`,
      sender: {
        userId: req.user._id,
      },
      system: {
        action: "rename_group",
        groupName: groupName,
      },
      createdAt: new Date(),
    });
    await systemMessage.save();

    emitNewMessage(io, conversation, systemMessage);
    emitUpdateGroupName(io, conversation._id, groupName);

    return res.status(200).json({ message: "Group name updated successfully" });
  } catch (error) {
    console.error("Error updating group name:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const favoriteInConversation = async function (req, res) {
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

    const isAlreadyFavorite = conversation.favoriteBy.some(
      (fav) => fav.toString() === req.user._id.toString(),
    );

    if (isAlreadyFavorite) {
      conversation.favoriteBy.pull(req.user._id);
      await conversation.save();

      return res
        .status(200)
        .json({ message: "Conversation removed from favorites successfully" });
    }

    conversation.favoriteBy.push(req.user._id);
    await conversation.save();

    return res
      .status(200)
      .json({ message: "Conversation added to favorites successfully" });
  } catch (error) {
    console.error("Error adding favorite conversation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
