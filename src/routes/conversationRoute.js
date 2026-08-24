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
  uploadGroupAvatar,
  updateGroupName,
  favoriteInConversation,
  uploadAttachment,
  MAX_ATTACHMENT_FILES,
  getAllAttachmentShareInConversation,
  shareConversation,
  joinConversationWithToken,
} from "../controllers/conversationController.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/", getAllConversations);
router.get("/:conversationId/messages", getMessagesInConversation);

router.get("/share", joinConversationWithToken);

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
export default router;
