import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import session from "express-session";

import authRoutes from "../auth/auth.routes";
import { requestLogger, errorLogger, logger } from "../middleware/logger";
import { serveMathCaptcha } from "./mathCaptcha";

const app = express();

// Segurança
// Segurança básica
app.use(helmet());

// Sessão (memória – usar Redis ou outro store em produção)
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "troca-por-um-segredo-forte",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 60 * 1000, // 10 minutos
    },
  })
);

// Registro de requisições HTTP
app.use(requestLogger);


// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    
  })
);


// Compressão - Reduz tamanho das respostas em ~70% para texto
app.use(compression())

// Leitura JSON com limite de segurança
app.use(express.json({ limit:'10kb'}));

// Cookies
app.use(cookieParser());


// Rotas de endpoints 

app.use("/api/auth", authRoutes);

// Rota pública para gerar o captcha matemático
app.get("/api/math-captcha", serveMathCaptcha);

// Registrar erros de aplicação
app.use(errorLogger);











// Rota teste
app.get("/", (req, res) => {
  res.json({
    status: "API funcionando 🚀",
   
  });
});


// Tratamento de erro básico
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error(err);

    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
);


export default app;
