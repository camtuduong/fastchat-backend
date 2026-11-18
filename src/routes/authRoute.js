import express from "express";

import {
  refreshToken,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
} from "#controllers/authController.js";
import { authMiddleware } from "#middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", signUp);

router.post("/signin", signIn);

router.post("/signin-with-google", signInWithGoogle);

router.post("/signout", authMiddleware, signOut);

router.post("/refresh-token", refreshToken);

export default router;
