import express from "express";
import { signUp, signIn, signOut } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", signUp);

router.post("/signin", signIn);

router.post("/signout", authMiddleware, signOut);

export default router;
