import express from "express";
import {
  getAllConversations,
  getMessagesInConversation,
  createNewConversation,
  seenConversation,
  getConversationById,
  removeConversationForMe,
  addPinnedMessageInConversation,
  unpinnedMessageInConversation,
  addNewMembersToConversation,
  removeMemberFromConversation,
} from "../controllers/conversationController.js";

const router = express.Router();

router.get("/", getAllConversations);
router.get("/:conversationId/messages", getMessagesInConversation);

router.get("/:conversationId", getConversationById);
router.post("/new", createNewConversation);
router.post("/:conversationId/add", addNewMembersToConversation);
router.delete(
  "/:conversationId/members/:memberId",
  removeMemberFromConversation,
);
router.patch("/:conversationId/seen", seenConversation);
router.patch("/:conversationId/remove-for-me", removeConversationForMe);

router.post("/:conversationId/messages/pin", addPinnedMessageInConversation);
router.patch("/:conversationId/messages/unpin", unpinnedMessageInConversation);

export default router;
