import express from "express";
import {
  deleteMessageWithEveryOne,
  sendMessage,
} from "../controllers/messageController.js";

const router = express.Router();

router.post("/", sendMessage);
router.delete("/:messageId", deleteMessageWithEveryOne);

export default router;
