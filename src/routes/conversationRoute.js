import express from "express";
import {
  getAllConversations,
  getMessagesInConversation,
  createNewConversation,
  seenConversation,
} from "../controllers/conversationController.js";

const router = express.Router();

router.get("/", getAllConversations);
router.get("/:conversationId/messages", getMessagesInConversation);
router.post("/new", createNewConversation);
router.patch("/:conversationId/seen", seenConversation);

export default router;
