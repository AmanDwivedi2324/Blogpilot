import express from "express";

import { getMe,updateMe } from "../controllers/user.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, upload.single("avatar"),updateMe);

export default router;