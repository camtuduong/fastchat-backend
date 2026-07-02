import express from "express";
import {
  getMe,
  updateProfile,
  findUserBySearch,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/me", getMe);
router.get("/all", findUserBySearch);
router.patch("/upload", updateProfile);

export default router;
