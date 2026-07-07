import express from "express";
import {
  getMe,
  updateProfile,
  findUserBySearch,
  getUserById,
  uploadAvatar,
} from "../controllers/userController.js";
import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/me", getMe);
router.get("/all", findUserBySearch);
router.get("/:userId", getUserById);
router.patch("/update", updateProfile);
router.post("/upload", upload.single("file"), uploadAvatar);

export default router;
