import express from "express";
import {
  acceptFriendRequest,
  sendFriendRequest,
  declineFriendRequest,
  getAllFriends,
  getFriendRequests,
} from "../controllers/friendController.js";

const router = express.Router();

router.post("/add", sendFriendRequest);

router.post("/:requestId/accept", acceptFriendRequest);

router.post("/:requestId/decline", declineFriendRequest);

router.get("/", getAllFriends);

router.get("/requests", getFriendRequests);

export default router;
