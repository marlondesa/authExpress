import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from 'compression';

import authRoutes from "../auth/auth.routes";

const app = express();

// Segurança
app.use(helmet());


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
    console.error(err);

    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
);


export default app;
