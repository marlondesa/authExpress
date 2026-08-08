import argon2 from "argon2";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { authRepository } from "../repositories/index";
import jwt from "jsonwebtoken";

function getJwtSecret(name: string, fallback?: string): string {
  const secret = process.env[name] || fallback;

  if (!secret) {
    throw new Error(`JWT secret ${name} não encontrado.`);
  }

  return secret;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createAccessToken(userId: string) {
  return jwt.sign(
    { userId },
    getJwtSecret("JWT_ACCESS_SECRET", process.env.JWT_SECRET),
    { expiresIn: "15m" }
  );
}

function createRefreshToken(userId: string) {
  return jwt.sign(
    { userId },
    getJwtSecret("JWT_REFRESH_SECRET", process.env.JWT_SECRET),
    { expiresIn: "7d" }
  );
}

function verifyRefreshToken(token: string) {
  const payload = jwt.verify(
    token,
    getJwtSecret("JWT_REFRESH_SECRET", process.env.JWT_SECRET)
  );

  if (typeof payload !== "object" || payload === null || typeof payload.userId !== "string") {
    throw new Error("Refresh token inválido.");
  }

  return payload.userId;
}

async function sendPasswordResetEmail(email: string, resetToken: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!host || !user || !pass) {
    console.warn("SMTP não configurado. O e-mail de recuperação não será enviado.");
    console.warn(`Reset password token: ${resetToken}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `no-reply@${host}`,
    to: email,
    subject: "Recuperação de senha",
    html: `<p>Você solicitou a recuperação de senha.</p><p>Clique no link para redefinir sua senha:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
  });
}

function createRandomToken() {
  return crypto.randomBytes(48).toString("hex");
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
}) {
  const userExists = await authRepository.findUserByEmail(data.email);

  if (userExists) {
    throw new Error("Email já cadastrado");
  }

  const passwordHash = await argon2.hash(data.password);

  const user = await authRepository.createUser({
    name: data.name,
    email: data.email,
    password: passwordHash,
  });

  return user;
}

export async function login(data: {
  email: string;
  password: string;
}) {
  const user = await authRepository.findUserByEmail(data.email);

  if (!user) {
    throw new Error("Email ou senha inválidos");
  }

  const isPasswordValid = await argon2.verify(user.password, data.password);

  if (!isPasswordValid) {
    throw new Error("Email ou senha inválidos");
  }

  const accessToken = createAccessToken(user.id);
  const refreshToken = createRefreshToken(user.id);
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await authRepository.createRefreshToken({
    token: refreshTokenHash,
    userId: user.id,
    expiresAt,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshToken(token: string) {
  const userId = verifyRefreshToken(token);
  const tokenHash = hashToken(token);
  const storedToken = await authRepository.findRefreshToken(tokenHash);

  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    throw new Error("Refresh token inválido ou expirado.");
  }

  await authRepository.revokeRefreshToken(tokenHash);

  const accessToken = createAccessToken(userId);
  const newRefreshToken = createRefreshToken(userId);
  const newRefreshTokenHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await authRepository.createRefreshToken({
    token: newRefreshTokenHash,
    userId,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(token: string) {
  const tokenHash = hashToken(token);
  await authRepository.revokeRefreshToken(tokenHash);
}

export async function forgotPassword(email: string) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    return;
  }

  const rawToken = createRandomToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await authRepository.createPasswordResetToken({
    token: tokenHash,
    userId: user.id,
    expiresAt,
  });

  await sendPasswordResetEmail(user.email, rawToken);
}

export async function resetPassword(data: {
  token: string;
  password: string;
}) {
  const tokenHash = hashToken(data.token);
  const storedToken = await authRepository.findPasswordResetToken(tokenHash);

  if (!storedToken || storedToken.used || storedToken.expiresAt < new Date()) {
    throw new Error("Token de recuperação inválido ou expirado.");
  }

  const user = await authRepository.findUserById(storedToken.userId);
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const passwordHash = await argon2.hash(data.password);

  await authRepository.updateUser(user.id, { password: passwordHash });
  await authRepository.markPasswordResetTokenUsed(tokenHash);
  await authRepository.revokeRefreshTokensByUserId(user.id);
}






