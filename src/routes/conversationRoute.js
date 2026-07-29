import express from "express";
import {
  getAllConversations,
  getMessagesInConversation,
  getMessagesPinnedInConversation,
  createNewConversation,
  seenConversation,
  getConversationById,
  removeConversationForMe,
  addPinnedMessageInConversation,
} from "../controllers/conversationController.js";

const router = express.Router();

router.get("/", getAllConversations);
router.get("/:conversationId/messages", getMessagesInConversation);

router.get("/:conversationId/messages/pinned", getMessagesPinnedInConversation);

router.get("/:conversationId", getConversationById);
router.post("/new", createNewConversation);
router.patch("/:conversationId/seen", seenConversation);
router.patch("/:conversationId/remove-for-me", removeConversationForMe);

router.post("/:conversationId/messages/pin", addPinnedMessageInConversation);

export default router;
