import express from "express";

import {
  addNewMembersToConversation,
  addPinnedMessageInConversation,
  createNewConversation,
  favoriteInConversation,
  getAllAttachmentShareInConversation,
  getAllConversations,
  getConversationById,
  getMessagesInConversation,
  getThreadSurface,
  getUsersActivity,
  joinConversationWithToken,
  MAX_ATTACHMENT_FILES,
  removeConversationForMe,
  removeMemberFromConversation,
  seenConversation,
  shareConversation,
  unpinnedMessageInConversation,
  updateGroupName,
  uploadAttachment,
  uploadGroupAvatar,
} from "#controllers/conversationController.js";
import { upload } from "#middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/", getAllConversations);
router.get("/:conversationId/messages", getMessagesInConversation);

router.get("/share", joinConversationWithToken);

router.get("/:conversationId", getConversationById);
router.post("/new", createNewConversation);

router.get("/:conversationId/users-activity", getUsersActivity);
router.post("/:conversationId/add", addNewMembersToConversation);
router.delete(
  "/:conversationId/members/:memberId",
  removeMemberFromConversation,
);

router.patch("/:conversationId/seen", seenConversation);
router.patch("/:conversationId/remove-for-me", removeConversationForMe);

router.post("/:conversationId/messages/pin", addPinnedMessageInConversation);
router.patch("/:conversationId/messages/unpin", unpinnedMessageInConversation);

router.post(
  "/:conversationId/upload-avatar",
  upload.single("file"),
  uploadGroupAvatar,
);

router.get("/:conversationId/attachments", getAllAttachmentShareInConversation);
router.post(
  "/:conversationId/upload",
  upload.array("files", MAX_ATTACHMENT_FILES),
  uploadAttachment,
);

router.patch("/:conversationId/rename", updateGroupName);
router.post("/:conversationId/favorite", favoriteInConversation);
//share conversation
router.post("/:conversationId/shares", shareConversation);

//thread surface
router.get("/:threadId/thread-surface", getThreadSurface);

export default router;
