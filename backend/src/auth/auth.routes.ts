import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  me,
  updateUser,
  deleteUser,
} from "./auth.controller";

import { validate } from "../middleware/zod";
import { requireAuth } from "../middleware/requireAuth";

import {
  loginRateLimiter,
  registerRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  refreshRateLimiter,
  generalRateLimiter,


} from "../middleware/rate.limite";
import { verifyMathCaptcha } from "../middleware/mathCaptchaValidator";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateUserSchema,
  deleteUserSchema,
} from "./authSchema";

const router = Router();

//Rota de login
router.post("/login", loginRateLimiter, verifyMathCaptcha, validate(loginSchema), login);
router.post("/register", registerRateLimiter, verifyMathCaptcha, validate(registerSchema), register);
router.post("/refresh-token", refreshRateLimiter, refreshToken);
router.post("/logout", generalRateLimiter, logout);
router.post("/forgot-password", forgotPasswordRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", resetPasswordRateLimiter, validate(resetPasswordSchema), resetPassword);

//Rota de verificação de usuarios Enum Role Admin || User .
router.put("/users/:id", requireAuth, validate(updateUserSchema), updateUser);
router.delete("/users/:id", requireAuth, validate(deleteUserSchema), deleteUser);




// Rota protegida – exige Authorization: Bearer <accessToken>
router.get("/me", generalRateLimiter, requireAuth, me);

export default router;