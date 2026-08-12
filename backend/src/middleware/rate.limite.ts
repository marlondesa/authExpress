import rateLimit from "express-rate-limit";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas requisições. Tente novamente em alguns minutos.",
  },
});





//Essa aqui não esta sendo usada, mas é uma boa
//  prática ter um rate limiter geral para todas as
//  rotas da API, caso o authRateLimiter não seja suficiente.

export const generalRateLimiter = rateLimit({

  windowMs: 15 * 60 * 1000, 
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas requisições. Tente novamente em alguns minutos.",
  },
})