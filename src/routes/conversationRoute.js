import express from "express";
import {
  getAllConversations,
  getMessagesInConversation,
  createNewConversation,
  seenConversation,
  getConversationById,
  removeConversationForMe,
} from "../controllers/conversationController.js";

const router = express.Router();

router.get("/", getAllConversations);
router.get("/:conversationId/messages", getMessagesInConversation);
router.get("/:conversationId", getConversationById);
router.post("/new", createNewConversation);
router.patch("/:conversationId/seen", seenConversation);
router.patch("/:conversationId/remove-for-me", removeConversationForMe);

export default router;
