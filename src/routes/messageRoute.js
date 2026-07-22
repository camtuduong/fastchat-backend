import express from "express";
import {
  deleteMessageWithEveryOne,
  sendDirectMessage,
  sendGroupMessage,
} from "../controllers/messageController.js";

const router = express.Router();

router.post("/direct", sendDirectMessage);
router.post("/group", sendGroupMessage);
router.delete("/:messageId", deleteMessageWithEveryOne);

export default router;
