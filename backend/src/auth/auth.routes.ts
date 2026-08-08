import { Router } from "express";
import { register, login, refreshToken, logout } from "./auth.controller";
import { validate } from "../middleware/zod";
import { authRateLimiter } from "../middleware/rate.limite";
import { loginSchema, registerSchema } from "./authSchema";

const router = Router();

router.post("/register", authRateLimiter, validate(registerSchema), register);
router.post("/login", authRateLimiter, validate(loginSchema), login);
router.post("/refresh-token", authRateLimiter, refreshToken);
router.post("/logout", authRateLimiter, logout);

export default router;
