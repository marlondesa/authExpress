import argon2 from "argon2";
import crypto from "crypto";
import nodemailer from "nodemailer";
import jwt, { JwtPayload } from "jsonwebtoken";
import { Role } from "@prisma/client";

import { authRepository, } from "../repositories/index";
import { AppError } from "../errors/AppError";
import { logger } from "../middleware/logger";

const ACCESS_TOKEN_EXPIRES_IN = "15m";

const REFRESH_TOKEN_EXPIRES_MS =
  7 * 24 * 60 * 60 * 1000;

const PASSWORD_RESET_TOKEN_EXPIRES_MS =
  15 * 60 * 1000;

/*
 * Hash Argon2id pré-computado, verificado quando o e-mail não existe.
 *
 * Garante que login de usuário inexistente execute Argon2
 * da mesma forma que um login com senha errada.
 *
 * Isso reduz a possibilidade de enumeração de contas
 * por timing.
 */
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$UGHeLgZC7pvrRh/fbvSlWA$gMcxODY7tI+or+O0X0MQaSXDcdKjMSuAkbMpiB4ZmCA";

/*
 * Retorna uma variável de ambiente obrigatória.
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não configurada.`
    );
  }

  return value;
}

/*
 * Retorna o segredo JWT.
 */
function getJwtSecret(name: string): string {
  return getRequiredEnv(name);
}

/*
 * Gera SHA-256 de um token.
 *
 * O token original nunca precisa ser armazenado no banco.
 */
function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/*
 * Gera token aleatório para recuperação de senha.
 */
function createRandomToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

/*
 * Cria Access Token.
 *
 * O role é colocado no JWT para que o middleware
 * consiga fazer autorização.
 */
function createAccessToken(
  userId: string,
  role: Role
): string {
  return jwt.sign(
    {
      userId,
      role,
      type: "access",
    },
    getJwtSecret("JWT_ACCESS_SECRET"),
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
}

/*
 * Cria Refresh Token.
 *
 * O Refresh Token não precisa carregar role,
 * pois sua finalidade é somente renovar a sessão.
 */
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

/*
 * Verifica Refresh Token.
 *
 * Retorna somente o userId depois de validar:
 *
 * - assinatura
 * - expiração
 * - estrutura
 * - type === refresh
 */
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

    return (
      payload as JwtPayload & {
        userId: string;
        type: string;
      }
    ).userId;
  } catch {
    throw new AppError(
      401,
      "Refresh token inválido ou expirado."
    );
  }
}

/*
 * Envia e-mail de recuperação de senha.
 */
async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const host = getRequiredEnv("SMTP_HOST");
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const from = getRequiredEnv("SMTP_FROM");
  const frontendUrl = getRequiredEnv("FRONTEND_URL");

  const port = Number(
    process.env.SMTP_PORT || 587
  );

  if (
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535
  ) {
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
    `${frontendUrl.replace(/\/+$/, "")}` +
    `/reset-password?token=${encodeURIComponent(
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
        Se você não solicitou essa recuperação,
        ignore este e-mail.
      </p>
    `,
  });
}

/*
 * ============================================================
 * REGISTER
 * ============================================================
 *
 * Cadastro público SEMPRE cria USER.
 *
 * Nunca permita que o frontend envie:
 *
 * {
 *   role: "ADMIN"
 * }
 *
 * O usuário comum não pode escolher o próprio nível
 * de privilégio.
 */
export async function register(data: {
  name: string;
  email: string;
  password: string;
}) {
  const email = data.email
    .trim()
    .toLowerCase();

  const name = data.name.trim();

  if (
    !name ||
    !email ||
    !data.password
  ) {
    throw new AppError(
      400,
      "Dados inválidos."
    );
  }

  const userExists =
    await authRepository.findUserByEmail(email);

  if (userExists) {
    throw new AppError(
      409,
      "Email já cadastrado."
    );
  }

  const passwordHash =
    await argon2.hash(data.password, {
      type: argon2.argon2id,
    });

  try {
    /*
     * Cadastro público nunca define role:
     * o @default(USER) do Prisma garante USER.
     */
    const user =
      await authRepository.createUser({
        name,
        email,
        password: passwordHash,
      });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (error: unknown) {
    const prismaError = error as {
      code?: string;
    };

    if (prismaError.code === "P2002") {
      throw new AppError(
        409,
        "Email já cadastrado."
      );
    }

    throw error;
  }
}

/*
 * ============================================================
 * LOGIN
 * ============================================================
 *
 * USER e ADMIN utilizam o MESMO login.
 *
 * A diferença é determinada pelo campo:
 *
 * user.role
 *
 * USER  → usuário comum
 * ADMIN → administrador
 */
export async function login(data: {
  email: string;
  password: string;
}) {
  const email = data.email
    .trim()
    .toLowerCase();

  if (
    !email ||
    !data.password
  )  {
    throw new AppError(
      401,
      "Email ou senha inválidos."
    );
  }

  const user =
    await authRepository.findUserByEmail(email);

  /*
   * Sempre executa Argon2:
   *
   * usuário existe
   *      ↓
   * hash real
   *
   * usuário não existe
   *      ↓
   * dummy hash
   *
   * Isso reduz diferença de timing.
   */
  const isPasswordValid =
    await argon2.verify(
      user
        ? user.password
        : DUMMY_PASSWORD_HASH,
      data.password
    );

  if (
    !user ||
    !isPasswordValid
  ) {
    throw new AppError(
      401,
      "Email ou senha inválidos."
    );
  }

  /*
   * O role vem do banco.
   *
   * Nunca vem do frontend.
   */
  const role = user.role as Role;

  /*
   * Access Token carrega:
   *
   * userId
   * role
   * type
   */
  const accessToken =
    createAccessToken(
      user.id,
      role
    );

  /*
   * Refresh Token identifica a sessão.
   */
  const refreshToken =
    createRefreshToken(user.id);

  /*
   * Somente o hash vai para o banco.
   */
  const refreshTokenHash =
    hashToken(refreshToken);

  const expiresAt = new Date(
    Date.now() +
      REFRESH_TOKEN_EXPIRES_MS
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
      role,
    },

    accessToken,

    refreshToken,
  };
}

/*
 * ============================================================
 * REFRESH TOKEN
 * ============================================================
 */
export async function refreshToken(
  token: string
) {
  if (
    !token ||
    typeof token !== "string"
  ) {
    throw new AppError(
      401,
      "Refresh token inválido ou expirado."
    );
  }

  /*
   * Primeiro valida a assinatura e estrutura
   * do JWT.
   */
  const userId =
    verifyRefreshToken(token);

  /*
   * Depois procura o hash no banco.
   */
  const tokenHash =
    hashToken(token);

  /*
   * IMPORTANTE:
   *
   * consumeRefreshToken precisa ser ATÔMICO
   * no repository.
   */
  const consumedToken =
    await authRepository.consumeRefreshToken(
      tokenHash
    );

  /*
   * Token não pôde ser consumido.
   */
  if (!consumedToken) {
    /*
     * Verifica se ele existia e já estava revogado.
     *
     * Se estiver revogado, pode indicar REUSE.
     */
    const existingToken =
      await authRepository.findRefreshToken(
        tokenHash
      );

    if (
      existingToken &&
      existingToken.revoked
    ) {
      /*
       * Token reutilizado.
       *
       * Revoga toda a família de refresh tokens
       * daquele usuário.
       */
      await authRepository
        .revokeRefreshTokensByUserId(
          userId
        );

      logger.warn(
        "Refresh token reutilizado — família revogada",
        {
          userId,
        }
      );
    }

    throw new AppError(
      401,
      "Refresh token inválido ou expirado."
    );
  }

  /*
   * Defesa adicional:
   *
   * O token encontrado no banco precisa
   * pertencer ao mesmo usuário do JWT.
   */
  if (
    consumedToken.userId !== userId
  ) {
    throw new AppError(
      401,
      "Refresh token inválido ou expirado."
    );
  }

  /*
   * IMPORTANTE:
   *
   * O role atual deve vir do banco.
   *
   * Não devemos confiar em um role antigo
   * armazenado em algum lugar externo.
   */
  const user =
    await authRepository.findUserById(
      userId
    );

  if (!user) {
    throw new AppError(
      401,
      "Usuário não encontrado."
    );
  }

  const role = user.role as Role;

  /*
   * Gera novo Access Token.
   */
  const accessToken =
    createAccessToken(
      user.id,
      role
    );

  /*
   * Rotation:
   *
   * Refresh antigo → consumido
   * Refresh novo → criado
   */
  const newRefreshToken =
    createRefreshToken(user.id);

  const newRefreshTokenHash =
    hashToken(newRefreshToken);

  const expiresAt = new Date(
    Date.now() +
      REFRESH_TOKEN_EXPIRES_MS
  );

  try {
    await authRepository.createRefreshToken({
      token: newRefreshTokenHash,
      userId: user.id,
      expiresAt,
    });
  } catch (error: unknown) {
    const prismaError = error as {
      code?: string;
    };

    if (
      prismaError.code === "P2002"
    ) {
      throw new AppError(
        500,
        "Não foi possível gerar refresh token."
      );
    }

    throw error;
  }

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

/*
 * ============================================================
 * LOGOUT
 * ============================================================
 */
export async function logout(
  token: string
): Promise<void> {
  if (
    !token ||
    typeof token !== "string"
  ) {
    return;
  }

  const tokenHash =
    hashToken(token);

  await authRepository.revokeRefreshToken(
    tokenHash
  );
}

/*
 * ============================================================
 * PROFILE
 * ============================================================
 */
export async function getProfile(
  userId: string
) {
  const user =
    await authRepository.findUserById(
      userId
    );

  if (!user) {
    throw new AppError(
      404,
      "Usuário não encontrado."
    );
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/*
 * ============================================================
 * FORGOT PASSWORD
 * ============================================================
 */
export async function forgotPassword(
  email: string
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  /*
   * Sempre retorna a mesma mensagem,
   * exista ou não uma conta.
   */
  const genericResponse = {
    message:
      "Se um usuário com este e-mail existir, um token será enviado.",
  };

  if (!normalizedEmail) {
    return genericResponse;
  }

  const user =
    await authRepository.findUserByEmail(
      normalizedEmail
    );

  if (!user) {
    return genericResponse;
  }

  /*
   * Nova solicitação invalida tokens anteriores.
   */
  await authRepository
    .revokePasswordResetTokensByUserId(
      user.id
    );

  /*
   * Token bruto:
   * somente o usuário recebe.
   */
  const rawToken =
    createRandomToken();

  /*
   * Hash:
   * somente o banco recebe.
   */
  const tokenHash =
    hashToken(rawToken);

  const expiresAt = new Date(
    Date.now() +
      PASSWORD_RESET_TOKEN_EXPIRES_MS
  );

  await authRepository
    .createPasswordResetToken({
      token: tokenHash,
      userId: user.id,
      expiresAt,
    });

  /*
   * Nunca colocar rawToken nos logs.
   */
  await sendPasswordResetEmail(
    user.email,
    rawToken
  );

  return genericResponse;
}

/*
 * ============================================================
 * RESET PASSWORD
 * ============================================================
 */
export async function resetPassword(
  data: {
    token: string;
    password: string;
  }
) {
  if (
    !data.token ||
    !data.password
  ) {
    throw new AppError(
      400,
      "Token ou senha inválidos."
    );
  }

  /*
   * Transforma token recebido em hash.
   */
  const tokenHash =
    hashToken(data.token);

  /*
   * IMPORTANTE:
   *
   * consumePasswordResetToken precisa ser
   * ATÔMICO no repository.
   *
   * O token só pode ser usado uma vez.
   */
  const resetToken =
    await authRepository
      .consumePasswordResetToken(
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

  /*
   * Novo hash Argon2id.
   */
  const passwordHash =
    await argon2.hash(
      data.password,
      {
        type: argon2.argon2id,
      }
    );

  /*
   * Deve acontecer em transação no repository:
   *
   * 1. alterar senha
   * 2. revogar sessões
   */
  await authRepository
    .updatePasswordAndRevokeSessions(
      user.id,
      passwordHash
    );

  return {
    message:
      "Senha alterada com sucesso.",
  };
}

/*
 * ============================================================
 * UPDATE USER
 * ============================================================
 *
 * Somente o próprio usuário (controller valida).
 *
 * O role NUNCA pode ser alterado aqui:
 *
 * - o schema Zod não aceita `role`
 * - esta função não repassa campos extras
 */
export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
  }
) {
  const updateData: {
    name?: string;
    email?: string;
  } = {};

  if (data.name !== undefined) {
    const name = data.name.trim();

    if (!name) {
      throw new AppError(
        400,
        "Nome inválido."
      );
    }

    updateData.name = name;
  }

  if (data.email !== undefined) {
    const email = data.email
      .trim()
      .toLowerCase();

    if (!email) {
      throw new AppError(
        400,
        "Email inválido."
      );
    }

    updateData.email = email;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(
      400,
      "Nenhum dado para atualizar."
    );
  }

  try {
    const user =
      await authRepository.updateUser(
        id,
        updateData
      );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (error: unknown) {
    const prismaError = error as {
      code?: string;
    };

    if (prismaError.code === "P2002") {
      throw new AppError(
        409,
        "Email já cadastrado."
      );
    }

    if (prismaError.code === "P2025") {
      throw new AppError(
        404,
        "Usuário não encontrado."
      );
    }

    throw error;
  }
}

/*
 * ============================================================
 * DELETE USER
 * ============================================================
 *
 * Somente o próprio usuário (controller valida).
 *
 * O onDelete: Cascade do schema remove também
 * os refresh tokens e tokens de reset.
 */
export async function deleteUser(
  id: string
): Promise<void> {
  try {
    await authRepository.deleteUser(id);
  } catch (error: unknown) {
    const prismaError = error as {
      code?: string;
    };

    if (prismaError.code === "P2025") {
      throw new AppError(
        404,
        "Usuário não encontrado."
      );
    }

    throw error;
  }
}

