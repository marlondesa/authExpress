import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

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

// Leitura JSON
app.use(express.json());

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
