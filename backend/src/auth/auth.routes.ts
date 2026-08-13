import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
} from "./auth.controller";

import { validate } from "../middleware/zod";

import {
  loginRateLimiter,
  registerRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  refreshRateLimiter,
  generalRateLimiter,


} from "../middleware/rate.limite";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./authSchema";

const router = Router();

router.post("/login", loginRateLimiter, validate(loginSchema), login);
router.post("/register", registerRateLimiter, validate(registerSchema), register);
router.post("/refresh-token", refreshRateLimiter, refreshToken);
router.post("/logout", generalRateLimiter, logout);
router.post("/forgot-password", forgotPasswordRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", resetPasswordRateLimiter, validate(resetPasswordSchema), resetPassword);

export default router;