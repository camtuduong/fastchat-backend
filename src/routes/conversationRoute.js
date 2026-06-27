import express from "express";
import {
  getAllConversations,
  getMessagesInConversation,
  createNewConversation,
  seenConversation,
  getConversationById,
} from "../controllers/conversationController.js";

const router = express.Router();

router.get("/", getAllConversations);
router.get("/:conversationId/messages", getMessagesInConversation);
router.get("/:conversationId", getConversationById);
router.post("/new", createNewConversation);
router.patch("/:conversationId/seen", seenConversation);

export default router;
