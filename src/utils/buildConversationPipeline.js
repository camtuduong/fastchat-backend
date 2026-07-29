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
    $addFields: {
      "pinnedMessages.displayName": {
        $arrayElemAt: ["$_senderUser.displayName", 0],
      },
      "pinnedMessages.avatarUrl": {
        $arrayElemAt: ["$_senderUser.avatarUrl", 0],
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

  ...pinnedMessagePipeline,
];
