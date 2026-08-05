export const emitAddMember = (io, conversationId, newMember) => {
  io.to(conversationId.toString()).emit("add-member", {
    conversationId,
    newMember,
  });
};

export const emitRemoveMember = (io, conversationId, removedMemberId) => {
  io.to(conversationId.toString()).emit("remove-member", {
    conversationId,
    removedMemberId,
  });
};

export const emitUpdateGroupAvatar = (io, conversationId, groupAvatarUrl) => {
  io.to(conversationId.toString()).emit("change-group-avatar", {
    conversationId,
    groupAvatarUrl,
  });
};

export const emitUpdateGroupName = (io, conversationId, groupName) => {
  io.to(conversationId.toString()).emit("rename_group", {
    conversationId,
    groupName,
  });
};
