import express from "express";
import { searchSticker } from "../controllers/stickerController.js";
const router = express.Router();

router.get("/search", searchSticker);
export default router;
