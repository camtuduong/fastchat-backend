import express from "express";
import { getMe, updateProfile } from "../controllers/userController.js";

const router = express.Router();

router.get("/me", getMe);
router.patch("/upload", updateProfile);

export default router;
