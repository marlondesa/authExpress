/**
 * Erro de negócio com status HTTP associado.
 *
 * Permite que o service diferencie falhas esperadas (credenciais inválidas,
 * e-mail duplicado, token expirado) de erros internos reais. O handler global
 * converte em resposta 4xx sem stack trace; qualquer outro erro vira 500.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}
