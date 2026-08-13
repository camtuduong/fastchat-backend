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
} from "../controllers/conversationController.js";
import { upload } from "../middlewares/uploadMiddleware.js";

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

router.post(
  "/:conversationId/upload-avatar",
  upload.single("file"),
  uploadGroupAvatar,
);
router.post(
  "/:conversationId/upload",
  upload.array("files", MAX_ATTACHMENT_FILES),
  uploadAttachment,
);

router.patch("/:conversationId/rename", updateGroupName);

router.post("/:conversationId/favorite", favoriteInConversation);
export default router;
