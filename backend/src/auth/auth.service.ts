import argon2 from "argon2";
import crypto from "crypto";
import nodemailer from "nodemailer";
import jwt, { JwtPayload } from "jsonwebtoken";

import { authRepository } from "../repositories/index";
import { AppError } from "../errors/AppError";
import { logger } from "../middleware/logger";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_EXPIRES_MS = 15 * 60 * 1000;

/*
 * Hash Argon2id pré-computado, verificado quando o e-mail não existe.
 * Garante que login de usuário inexistente leve o mesmo tempo que um
 * login com senha errada — impede enumeração de contas por timing
 * (ASVS 2.2.1 / OWASP Cheat Sheet: Authentication).
 */
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$UGHeLgZC7pvrRh/fbvSlWA$gMcxODY7tI+or+O0X0MQaSXDcdKjMSuAkbMpiB4ZmCA";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada.`);
  }

  return value;
}

function getJwtSecret(name: string): string {
  return getRequiredEnv(name);
}

function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function createRandomToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

function createAccessToken(userId: string): string {
  return jwt.sign(
    {
      userId,
      type: "access",
    },
    getJwtSecret("JWT_ACCESS_SECRET"),
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
}

function createRefreshToken(userId: string): string {
  return jwt.sign(
    {
      userId,
      type: "refresh",
    },
    getJwtSecret("JWT_REFRESH_SECRET"),
    {
      expiresIn: "7d",
      jwtid: crypto.randomUUID(),
    }
  );
}

function verifyRefreshToken(token: string): string {
  try {
    const payload = jwt.verify(
      token,
      getJwtSecret("JWT_REFRESH_SECRET")
    );

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as JwtPayload).userId !== "string" ||
      (payload as JwtPayload).type !== "refresh"
    ) {
      throw new Error();
    }

    return (payload as JwtPayload & {
      userId: string;
      type: string;
    }).userId;
  } catch {
    throw new AppError(401, "Refresh token inválido ou expirado.");
  }
}

async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const host = getRequiredEnv("SMTP_HOST");
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const from = getRequiredEnv("SMTP_FROM");
  const frontendUrl = getRequiredEnv("FRONTEND_URL");

  const port = Number(process.env.SMTP_PORT || 587);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("SMTP_PORT inválida.");
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

  const resetLink =
    `${frontendUrl.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(
      resetToken
    )}`;

  await transporter.sendMail({
    from,
    to: email,
    subject: "Recuperação de senha",
    text: [
      "Você solicitou a recuperação de senha.",
      "",
      `Acesse o link para redefinir sua senha: ${resetLink}`,
      "",
      "Este link expira em 15 minutos.",
      "",
      "Se você não solicitou essa recuperação, ignore este e-mail.",
    ].join("\n"),
    html: `
      <p>Você solicitou a recuperação de senha.</p>

      <p>
        <a href="${resetLink}">
          Redefinir senha
        </a>
      </p>

      <p>Este link expira em 15 minutos.</p>

      <p>
        Se você não solicitou essa recuperação, ignore este e-mail.
      </p>
    `,
  });
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
}) {
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();

  if (!name || !email || !data.password) {
    throw new AppError(400, "Dados inválidos.");
  }

  const userExists = await authRepository.findUserByEmail(email);

  if (userExists) {
    throw new AppError(409, "Email já cadastrado.");
  }

  const passwordHash = await argon2.hash(data.password, {
    type: argon2.argon2id,
  });

  try {
    const user = await authRepository.createUser({
      name,
      email,
      password: passwordHash,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  } catch (error: unknown) {
    const prismaError = error as {
      code?: string;
    };

    if (prismaError.code === "P2002") {
      throw new AppError(409, "Email já cadastrado.");
    }

    throw error;
  }
}

export async function login(data: {
  email: string;
  password: string;
}) {
  const email = data.email.trim().toLowerCase();

  if (!email || !data.password) {
    throw new AppError(401, "Email ou senha inválidos.");
  }

  const user = await authRepository.findUserByEmail(email);

  /*
   * Verifica SEMPRE contra um hash — o real do usuário ou o dummy —
   * para que o tempo de resposta não revele se o e-mail existe.
   */
  const isPasswordValid = await argon2.verify(
    user ? user.password : DUMMY_PASSWORD_HASH,
    data.password
  );

  if (!user || !isPasswordValid) {
    throw new AppError(401, "Email ou senha inválidos.");
  }

  const accessToken = createAccessToken(user.id);

  const refreshToken = createRefreshToken(user.id);
  const refreshTokenHash = hashToken(refreshToken);

  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRES_MS
  );

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
  if (!token || typeof token !== "string") {
    throw new AppError(401, "Refresh token inválido ou expirado.");
  }

  const userId = verifyRefreshToken(token);
  const tokenHash = hashToken(token);

  /*
   * IMPORTANTE:
   * Esta operação precisa ser ATÔMICA no repository.
   *
   * Ela deve somente consumir o token se:
   * - existir
   * - não estiver revogado
   * - não estiver expirado
   *
   * E deve retornar null se outra requisição já tiver consumido.
   */
  const consumedToken =
    await authRepository.consumeRefreshToken(tokenHash);

  if (!consumedToken) {
    /*
     * Detecção de REUSO (OWASP): se o JWT é válido mas o registro no
     * banco já está revogado, algum token vazou e dois atores possuem
     * a mesma credencial. Revogamos TODA a família do usuário —
     * o legítimo será obrigado a logar de novo, mas o atacante
     * também perde o acesso.
     */
    const existingToken =
      await authRepository.findRefreshToken(tokenHash);

    if (existingToken && existingToken.revoked) {
      await authRepository.revokeRefreshTokensByUserId(userId);

      logger.warn("Refresh token reutilizado — família revogada", {
        userId,
      });
    }

    throw new AppError(401, "Refresh token inválido ou expirado.");
  }

  if (consumedToken.userId !== userId) {
    throw new AppError(401, "Refresh token inválido ou expirado.");
  }

  const accessToken = createAccessToken(userId);

  const newRefreshToken = createRefreshToken(userId);
  const newRefreshTokenHash = hashToken(newRefreshToken);

  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRES_MS
  );

  try {
    await authRepository.createRefreshToken({
      token: newRefreshTokenHash,
      userId,
      expiresAt,
    });
  } catch (error: unknown) {
    const prismaError = error as {
      code?: string;
    };

    if (prismaError.code === "P2002") {
      throw new AppError(500, "Não foi possível gerar refresh token.");
    }

    throw error;
  }

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(token: string): Promise<void> {
  if (!token || typeof token !== "string") {
    return;
  }

  const tokenHash = hashToken(token);

  await authRepository.revokeRefreshToken(tokenHash);
}

export async function getProfile(userId: string) {
  const user = await authRepository.findUserById(userId);

  if (!user) {
    throw new AppError(404, "Usuário não encontrado.");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

export async function forgotPassword(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  /*
   * A mensagem de resposta deve ser igual exista ou não
   * uma conta com aquele e-mail.
   */
  const genericResponse = {
    message:
      "Se um usuário com este e-mail existir, um token será enviado.",
  };

  if (!normalizedEmail) {
    return genericResponse;
  }

  const user =
    await authRepository.findUserByEmail(normalizedEmail);

  if (!user) {
    return genericResponse;
  }

  /*
   * Uma nova solicitação invalida tokens anteriores.
   */
  await authRepository.revokePasswordResetTokensByUserId(
    user.id
  );

  const rawToken = createRandomToken();
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_MS
  );

  await authRepository.createPasswordResetToken({
    token: tokenHash,
    userId: user.id,
    expiresAt,
  });

  /*
   * Nunca coloque rawToken em logs.
   */
  await sendPasswordResetEmail(
    user.email,
    rawToken
  );

  return genericResponse;
}

export async function resetPassword(data: {
  token: string;
  password: string;
}) {
  if (!data.token || !data.password) {
    throw new AppError(400, "Token ou senha inválidos.");
  }

  /*
   * A validação de tamanho/complexidade da senha
   * deve ser feita também no controller/schema.
   */

  const tokenHash = hashToken(data.token);

  /*
   * Esta operação precisa ser ATÔMICA.
   *
   * O token só pode ser consumido uma vez.
   */
  const resetToken =
    await authRepository.consumePasswordResetToken(
      tokenHash
    );

  if (!resetToken) {
    throw new AppError(
      400,
      "Token de recuperação inválido ou expirado."
    );
  }

  const user =
    await authRepository.findUserById(
      resetToken.userId
    );

  if (!user) {
    throw new AppError(
      400,
      "Token de recuperação inválido ou expirado."
    );
  }

  const passwordHash = await argon2.hash(
    data.password,
    {
      type: argon2.argon2id,
    }
  );

  /*
   * Idealmente updateUser + revogação dos refresh tokens
   * devem acontecer em uma transação no repository.
   */
  await authRepository.updatePasswordAndRevokeSessions(
    user.id,
    passwordHash
  );

  return {
    message: "Senha alterada com sucesso.",
  };
}