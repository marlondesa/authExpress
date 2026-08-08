import argon2 from "argon2";
import { authRepository } from "../repositories/index";
import jwt from "jsonwebtoken";

function getJwtSecret(name: string, fallback?: string): string {
  const secret = process.env[name] || fallback;

  if (!secret) {
    throw new Error(`JWT secret ${name} não encontrado.`);
  }

  return secret;
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
    { expiresIn: "1w" }
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

  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const accessToken = createAccessToken(user.id);

  return { accessToken };
}






