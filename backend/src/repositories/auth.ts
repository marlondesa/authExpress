import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definido.");
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    }),
});

/*
|--------------------------------------------------------------------------
| Users
|--------------------------------------------------------------------------
*/

export async function createUser(data: {
    name: string;
    email: string;
    password: string;
}) {
    return prisma.user.create({
        data,
    });
}

export async function findUserByEmail(email: string) {
    return prisma.user.findUnique({
        where: {
            email,
        },
    });
}

export async function findUserById(id: string) {
    return prisma.user.findUnique({
        where: {
            id,
        },
    });
}

export async function updateUser(
    id: string,
    data: {
        name?: string;
        email?: string;
        password?: string;
    }
) {
    return prisma.user.update({
        where: {
            id,
        },
        data,
    });
}

export async function deleteUser(id: string) {
    return prisma.user.delete({
        where: {
            id,
        },
    });
}

/*
|--------------------------------------------------------------------------
| Refresh Tokens
|--------------------------------------------------------------------------
*/

export async function createRefreshToken(data: {
    token: string;
    userId: string;
    expiresAt: Date;
}) {
    return prisma.refreshToken.create({
        data,
    });
}

export async function findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
        where: {
            token,
        },
    });
}

export async function revokeRefreshToken(token: string) {
    return prisma.refreshToken.updateMany({
        where: {
            token,
            revoked: false,
        },
        data: {
            revoked: true,
            revokedAt: new Date(),
        },
    });
}

export async function revokeRefreshTokensByUserId(
    userId: string
) {
    return prisma.refreshToken.updateMany({
        where: {
            userId,
            revoked: false,
        },
        data: {
            revoked: true,
            revokedAt: new Date(),
        },
    });
}

/*
|--------------------------------------------------------------------------
| Consume Refresh Token
|--------------------------------------------------------------------------
|
| Operação atômica:
|
| - token precisa existir
| - token não pode estar revogado
| - token não pode estar expirado
|
| Apenas uma requisição consegue consumir o token.
|
*/

export async function consumeRefreshToken(
    token: string
) {
    const now = new Date();

    const result =
        await prisma.refreshToken.updateMany({
            where: {
                token,
                revoked: false,
                expiresAt: {
                    gt: now,
                },
            },
            data: {
                revoked: true,
                revokedAt: now,
            },
        });

    if (result.count !== 1) {
        return null;
    }

    return prisma.refreshToken.findUnique({
        where: {
            token,
        },
    });
}

/*
|--------------------------------------------------------------------------
| Password Reset Tokens
|--------------------------------------------------------------------------
*/

export async function createPasswordResetToken(
    data: {
        token: string;
        userId: string;
        expiresAt: Date;
    }
) {
    return prisma.passwordResetToken.create({
        data,
    });
}

export async function findPasswordResetToken(
    token: string
) {
    return prisma.passwordResetToken.findUnique({
        where: {
            token,
        },
    });
}

export async function markPasswordResetTokenUsed(
    token: string
) {
    return prisma.passwordResetToken.updateMany({
        where: {
            token,
            used: false,
        },
        data: {
            used: true,
        },
    });
}

/*
|--------------------------------------------------------------------------
| Consume Password Reset Token
|--------------------------------------------------------------------------
|
| Operação atômica.
|
| Somente uma requisição consegue consumir o token.
|
*/

export async function consumePasswordResetToken(
    token: string
) {
    const now = new Date();

    const result =
        await prisma.passwordResetToken.updateMany({
            where: {
                token,
                used: false,
                expiresAt: {
                    gt: now,
                },
            },
            data: {
                used: true,
            },
        });

    if (result.count !== 1) {
        return null;
    }

    return prisma.passwordResetToken.findUnique({
        where: {
            token,
        },
    });
}

/*
|--------------------------------------------------------------------------
| Revoke Password Reset Tokens
|--------------------------------------------------------------------------
*/

export async function revokePasswordResetTokensByUserId(
    userId: string
) {
    return prisma.passwordResetToken.updateMany({
        where: {
            userId,
            used: false,
        },
        data: {
            used: true,
        },
    });
}

/*
|--------------------------------------------------------------------------
| Update Password + Revoke Sessions
|--------------------------------------------------------------------------
|
| As duas operações acontecem na mesma transação.
|
*/

export async function updatePasswordAndRevokeSessions(
    userId: string,
    passwordHash: string
) {
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
            where: {
                id: userId,
            },
            data: {
                password: passwordHash,
            },
        });

        await tx.refreshToken.updateMany({
            where: {
                userId,
                revoked: false,
            },
            data: {
                revoked: true,
                revokedAt: new Date(),
            },
        });

        return user;
    });
}

/*
|--------------------------------------------------------------------------
| Repository
|--------------------------------------------------------------------------
*/

export const authRepository = {
    createUser,
    findUserByEmail,
    findUserById,
    updateUser,
    deleteUser,

    createRefreshToken,
    findRefreshToken,
    revokeRefreshToken,
    revokeRefreshTokensByUserId,
    consumeRefreshToken,

    createPasswordResetToken,
    findPasswordResetToken,
    markPasswordResetTokenUsed,
    consumePasswordResetToken,
    revokePasswordResetTokensByUserId,

    updatePasswordAndRevokeSessions,
};