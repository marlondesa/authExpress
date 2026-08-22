declare global {
  namespace Express {
    interface Request {
      /** ID do usuário autenticado — injetado pelo middleware requireAuth */
      userId?: string;
    }
  }
}

export {};
