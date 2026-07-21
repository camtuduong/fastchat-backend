//update db
export const updateConversationAfterCreateMessage = (
  conversation,
  message,
  senderId,
) => {
  conversation.set({
    seenBy: [],
    lastMessageAt: message.createdAt,
    lastMessage: {
      _id: message._id,
      content: message.content,
      senderId,
      createdAt: message.createdAt,
    },
  });

  conversation.participants.forEach((p) => {
    const memberId = p.userId.toString();
    const isSender = memberId === senderId.toString();

    const prevCount = conversation.unreadCount.get(memberId) || 0;

    conversation.unreadCount.set(memberId, isSender ? 0 : prevCount + 1);

    p.set({
      hidden: false,
    });
  });
};

//gửi socket
export const emitNewMessage = (io, conversation, message) => {
  io.to(conversation._id.toString()).emit("new-message", {
    message,
    conversation: {
      _id: conversation._id,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      participants: conversation.participants.map((p) => ({
        hidden: p.hidden,
      })),
    },
    unreadCount: conversation.unreadCount,
  });
};

//update db
export const updateConversationAfterDeleteMessage = (
  conversation,
  messageId,
  newLatestMessage,
) => {
  if (conversation.lastMessage._id.toString() === messageId.toString()) {
    if (newLatestMessage) {
      conversation.set({
        lastMessage: {
          _id: newLatestMessage._id,
          content: newLatestMessage.content,
          senderId: newLatestMessage.sender.userId,
          createdAt: newLatestMessage.createdAt,
        },
        lastMessageAt: newLatestMessage.createdAt,
      });
      return;
    }

    conversation.set({
      lastMessage: null,
      lastMessageAt: null,
    });
  }
};

//gửi socket
export const emitDeleteMessage = (
  io,
  conversation,
  messageId,
  newLatestMessage,
  isDeletingLastMessage,
) => {
  io.to(conversation._id.toString()).emit("delete-message", {
    ...(isDeletingLastMessage
      ? {
          conversation: {
            _id: conversation._id,
            lastMessage: newLatestMessage
              ? {
                  _id: newLatestMessage._id,
                  content: newLatestMessage.content,
                  senderId: newLatestMessage.sender.userId,
                  createdAt: newLatestMessage.createdAt,
                }
              : null,
            lastMessageAt: newLatestMessage ? newLatestMessage.createdAt : null,
          },
        }
      : {}),
  });
};
