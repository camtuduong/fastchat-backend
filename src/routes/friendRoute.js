import express from "express";

import {
  acceptFriendRequest,
  declineFriendRequest,
  getAllFriends,
  getFriendRequests,
  listSuggestedUsers,
  sendFriendRequest,
} from "#controllers/friendController.js";

const router = express.Router();

router.post("/add", sendFriendRequest);

router.post("/:requestId/accept", acceptFriendRequest);

router.post("/:requestId/decline", declineFriendRequest);

router.get("/my-friends", getAllFriends);
router.get("/suggest", listSuggestedUsers);

router.get("/requests", getFriendRequests);

export default router;
