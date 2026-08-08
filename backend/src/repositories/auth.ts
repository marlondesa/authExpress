import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definido.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

//aqui é os parametros que esta no banco de dados, objetos 
//So é resposabilidades
export async function createUser(data: {

    name: string;
    email: string;
    password: string;
}) {
    return prisma.user.create({
        data,
    });


}
// Aqui é email do usuarios
export async function findUserByEmail(email: string) {
    return prisma.user.findUnique({
        where: {
            email,
        },
    });
}


//aqui é id do usuarios ! 
export async function findUserById(id: string) {
    return prisma.user.findUnique({
        where: {
            id,
        }
    })

}


//Aqui podemos atulizar o o login, senha , name e ID 
export async function updateUser(id: string,
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
    })
};



//Aqui Vamos Deleta contas no banco

export async function deleteUser(id: string) {
    return prisma.user.delete({
        where: {
            id,
        }
    })
}

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
        },
    });
}

export async function revokeRefreshTokensByUserId(userId: string) {
    return prisma.refreshToken.updateMany({
        where: {
            userId,
            revoked: false,
        },
        data: {
            revoked: true,
        },
    });
}

export async function createPasswordResetToken(data: {
    token: string;
    userId: string;
    expiresAt: Date;
}) {
    return prisma.passwordResetToken.create({
        data,
    });
}

export async function findPasswordResetToken(token: string) {
    return prisma.passwordResetToken.findUnique({
        where: {
            token,
        },
    });
}

export async function markPasswordResetTokenUsed(token: string) {
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
    createPasswordResetToken,
    findPasswordResetToken,
    markPasswordResetTokenUsed,
}
