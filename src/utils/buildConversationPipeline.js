export const pinnedMessagePipeline = [
  {
    $lookup: {
      from: "users",
      localField: "pinnedMessages.pinnedBy",
      foreignField: "_id",
      as: "_senderUser",
    },
  },
  {
    $lookup: {
      from: "messages",
      localField: "pinnedMessages.messageId",
      foreignField: "_id",
      as: "_message",
    },
  },
  {
    $addFields: {
      "pinnedMessages.displayName": {
        $arrayElemAt: ["$_senderUser.displayName", 0],
      },
      "pinnedMessages.avatarUrl": {
        $arrayElemAt: ["$_senderUser.avatarUrl", 0],
      },
      "pinnedMessages.content": {
        $arrayElemAt: ["$_message.content", 0],
      },
    },
  },
  {
    $project: {
      _senderUser: 0,
    },
  },
];

export const buildConversationPipeline = (filter) => [
  { $match: filter },
  {
    $set: {
      pinnedMessages: {
        $sortArray: {
          input: "$pinnedMessages",
          sortBy: {
            pinnedAt: -1,
          },
        },
      },
    },
  },
  ...pinnedMessagePipeline,
];
