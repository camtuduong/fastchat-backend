import express from "express";
import {
  deleteMessageWithEveryOne,
  sendMessage,
  pinMessage,
} from "../controllers/messageController.js";

const router = express.Router();

router.post("/", sendMessage);
router.patch("/:messageId/pin", pinMessage);
router.delete("/:messageId", deleteMessageWithEveryOne);

export default router;
