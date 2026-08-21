import { Request, Response } from "express";

/**
 * Gera uma operação matemática simples (adição, subtração ou multiplicação)
 * e devolve a resposta esperada armazenada na sessão.
 */
function generateMath(): { question: string; answer: number } {
  // Agora usamos números de 0 a 9 (incluindo zero).
  const ops = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a: number;
  let b: number;
  let answer: number;
  let expr: string;
  switch (op) {
    case "+":
      a = Math.floor(Math.random() * 10); // 0‑9
      b = Math.floor(Math.random() * 10);
      answer = a + b;
      expr = `${a} + ${b} = ?`;
      break;
    case "-":
      // gera b primeiro e garante a >= b para que o resultado nunca seja negativo
      b = Math.floor(Math.random() * 10);
      a = Math.floor(Math.random() * (10 - b)) + b; // a está no intervalo [b,9]
      answer = a - b;
      expr = `${a} - ${b} = ?`;
      break;
    case "×":
      a = Math.floor(Math.random() * 10);
      b = Math.floor(Math.random() * 10);
      answer = a * b;
      expr = `${a} × ${b} = ?`;
      break;
    default:
      a = Math.floor(Math.random() * 10);
      b = Math.floor(Math.random() * 10);
      answer = a + b;
      expr = `${a} + ${b} = ?`;
  }
  return { question: expr, answer };
}

/**
 * Renderiza o texto da operação em uma imagem PNG com ruído simples.
 */
// For simplicity, we return the question as plain text JSON instead of an image.
/**
 * Converte a expressão de texto em uma imagem PNG (data‑uri) com ruído
 * simples. Cada chamada gera fundo, linhas e fonte aleatórios, dificultando
 * a criação de um dicionário estático de imagem → número.
 */
function renderToImage(question: string): { image: string } {
  const width = 150;
  const height = 50;

  // Cor de fundo aleatória (hsl) para dificultar mapeamento
  const bgColor = `hsl(${Math.random() * 360}, 30%, 95%)`;

  // Escolha aleatória de fonte e tamanho
  const fontSize = 24 + Math.floor(Math.random() * 6); // 24‑29px
  const fonts = ["sans-serif", "Arial", "Courier New", "Georgia"];
  const font = fonts[Math.floor(Math.random() * fonts.length)];

  // Gerar linhas de ruído como <line> SVG
  let noiseLines = "";
  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const opacity = Math.random() * 0.2;
    noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(0,0,0,${opacity})" stroke-width="1" />`;
  }

  // Posicionamento aleatório do texto
  const textX = 10 + Math.random() * 10;
  const textY = height / 2 + (Math.random() - 0.5) * 6;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${bgColor}" />
    ${noiseLines}
    <text x="${textX}" y="${textY}" font-family="${font}" font-size="${fontSize}" fill="#222" dominant-baseline="middle">${question}</text>
  </svg>`;

  // Encode SVG como data‑uri base64
  const base64 = Buffer.from(svg).toString("base64");
  return { image: `data:image/svg+xml;base64,${base64}` };
}

/**
 * GET /api/math-captcha – gera a imagem e guarda a resposta na sessão.
 */
export const serveMathCaptcha = (req: Request, res: Response) => {
  const { question, answer } = generateMath();
  // armazena a resposta (string) na sessão do usuário
  // @ts-ignore – a sessão pode ter campos dinâmicos
  req.session.mathCaptchaAnswer = answer.toString();
  const payload = renderToImage(question);
  res.json(payload);
};
