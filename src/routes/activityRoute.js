import express from "express";

import { getAllActivityLogs } from "#controllers/activityLogController.js";

const router = express.Router();

router.get("/:notificationId", getAllActivityLogs);

export default router;
