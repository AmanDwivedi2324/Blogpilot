import express from "express";

import { register, login, refresh, logout, forgotPasswordController, verifyOtp } from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
// router.get("/me", authenticate, getMe);
router.post("/forgot-password", forgotPasswordController);
router.post("/verify-otp", verifyOtp);


export default router;