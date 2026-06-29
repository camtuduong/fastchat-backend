import { Server } from "socket.io";
import { socketMiddleware } from "../middlewares/socketMiddleware.js";
import { getUserConversationsForSocket } from "../controllers/conversationController.js";

export const createSocketServer = (server, corsOptions) => {
  const io = new Server(server, {
    cors: corsOptions,
  });

  io.use(socketMiddleware);

  const onlineUsers = new Map(); // {userId: socketId}

  io.on("connection", async (socket) => {
    const user = socket.user;
    console.log(`User ${user.username} online with Socket ID: ${socket.id}`);

    onlineUsers.set(user._id, socket.id);
    io.emit("online-users", Array.from(onlineUsers.keys()));

    const conversationIds = await getUserConversationsForSocket(user._id);
    // Join the user to their conversation rooms
    conversationIds.forEach((conversationId) => {
      socket.join(conversationId);
    });

    socket.on("disconnect", () => {
      console.log(`User ${user.username} offline with Socket ID: ${socket.id}`);
      onlineUsers.delete(user._id);
      io.emit("online-users", Array.from(onlineUsers.keys()));
    });
  });

  return io;
};
