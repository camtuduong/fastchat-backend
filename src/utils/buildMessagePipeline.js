export const senderPipeline = [
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
      "sender.displayName": {
        $arrayElemAt: ["$_senderUser.displayName", 0],
      },
      "sender.avatarUrl": {
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

export const replyPipeline = [
  {
    $lookup: {
      from: "messages",
      let: { replyToId: "$replyTo" },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$_id", "$$replyToId"],
            },
          },
        },
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
            "sender.displayName": {
              $arrayElemAt: ["$_senderUser.displayName", 0],
            },
            "sender.avatarUrl": {
              $arrayElemAt: ["$_senderUser.avatarUrl", 0],
            },
          },
        },
        {
          $project: {
            _senderUser: 0,
            replyTo: 0,
          },
        },
      ],
      as: "_replyTo",
    },
  },
  {
    $addFields: {
      replyTo: {
        $ifNull: [{ $arrayElemAt: ["$_replyTo", 0] }, null],
      },
    },
  },
  {
    $project: {
      _replyTo: 0,
    },
  },
];

export const buildMessagePipeline = (filter, limit = 40) => [
  { $match: filter },
  { $sort: { createdAt: -1 } },
  { $limit: limit },

  ...senderPipeline,
  ...replyPipeline,
];
