import { Server } from "socket.io";
import { socketMiddleware } from "../middlewares/socketMiddleware.js";
import { getUserConversationsForSocket } from "../controllers/conversationController.js";

export const onlineUsers = new Map(); // {userId: socketId}

export const createSocketServer = (server, corsOptions) => {
  const io = new Server(server, {
    cors: corsOptions,
  });

  io.use(socketMiddleware);

  io.on("connection", async (socket) => {
    const user = socket.user;
    console.log(`User ${user.username} online with Socket ID: ${socket.id}`);

    const userId = user._id.toString();

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }

    onlineUsers.get(userId).add(socket.id);

    io.emit("online-users", Array.from(onlineUsers.keys()));

    const conversationIds = await getUserConversationsForSocket(user._id);
    // Join the user to their conversation rooms
    conversationIds.forEach((conversationId) => {
      socket.join(conversationId);
    });

    socket.on("disconnect", () => {
      console.log(`User ${user.username} offline with Socket ID: ${socket.id}`);

      const userId = user._id.toString();
      const socketIds = onlineUsers.get(userId);

      if (socketIds) {
        socketIds.delete(socket.id);

        if (socketIds.size === 0) {
          onlineUsers.delete(userId);
        }
      }

      io.emit("online-users", Array.from(onlineUsers.keys()));
    });

    conversationIds.forEach((conversationId) => {
      console.log(io.sockets.adapter.rooms.get(conversationId));
    });
  });
  return io;
};
