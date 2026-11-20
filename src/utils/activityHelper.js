export const updateNotificationAfterAddActivity = (notification) => {
  const prevCount = notification.unReadCount || 0;

  notification.unReadCount = prevCount + 1;
};

export const emitNotification = (io, userId, activity, notification) => {
  io.to(userId.toString()).emit("activity-logs", {
    activity,
    unReadCount: notification.unReadCount,
  });
};
