export const getFriend = (friendA, friendB, userId) => {
  return friendA._id.toString() === userId.toString() ? friendB : friendA;
};
