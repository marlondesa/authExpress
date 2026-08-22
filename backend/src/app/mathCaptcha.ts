import { Request, Response } from "express";
import { randomInt } from "crypto";
import { createCanvas } from "canvas";

/**
 * Gera uma operação matemática simples (adição, subtração ou multiplicação).
 * Os operandos usam crypto.randomInt (fonte criptográfica); a resposta nunca
 * sai do servidor — fica apenas na sessão.
 */
function generateMath(): { question: string; answer: number } {
  const ops = ["+", "-", "×"];
  const op = ops[randomInt(ops.length)];

  let a: number;
  let b: number;
  switch (op) {
    case "-":
      // garante a >= b para que o resultado nunca seja negativo
      b = randomInt(10);
      a = randomInt(b, 10);
      return { question: `${a} - ${b} = ?`, answer: a - b };
    case "×":
      a = randomInt(10);
      b = randomInt(10);
      return { question: `${a} × ${b} = ?`, answer: a * b };
    default:
      a = randomInt(10);
      b = randomInt(10);
      return { question: `${a} + ${b} = ?`, answer: a + b };
  }
}

/**
 * Renderiza a expressão como PNG rasterizado (node-canvas).
 *
 * Cada caractere recebe rotação, tamanho, fonte e deslocamento vertical
 * aleatórios; linhas de interferência cruzam o texto e pontos de ruído
 * cobrem o fundo. O conteúdo da imagem contém somente pixels — a expressão
 * não existe em texto em lugar nenhum da resposta.
 */

const FONTS = ["sans-serif", "serif", "monospace", "Arial", "Georgia"];
const MAX_ROTATION = 0.4; // ~±23°

function renderToImage(question: string): { image: string } {
  const width = 200;
  const height = 60;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // --- Fundo: gradiente irregular com tons claros aleatórios ---
  const hue = randomInt(360);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${hue}, 30%, ${88 + randomInt(8)}%)`);
  gradient.addColorStop(1, `hsl(${(hue + 40) % 360}, 25%, ${80 + randomInt(10)}%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // --- Pontos de ruído espalhados (antes do texto) ---
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `hsla(${randomInt(360)}, 40%, ${30 + randomInt(50)}%, ${0.15 + Math.random() * 0.25})`;
    ctx.fillRect(randomInt(width), randomInt(height), 1 + randomInt(2), 1 + randomInt(2));
  }

  // --- Curvas de interferência sob o texto ---
  const third = Math.floor(width / 3);
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `hsla(${randomInt(360)}, 50%, 40%, ${0.25 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    ctx.moveTo(randomInt(third), randomInt(height));
    ctx.bezierCurveTo(
      randomInt(width), randomInt(height),
      randomInt(width), randomInt(height),
      width - randomInt(third), randomInt(height)
    );
    ctx.stroke();
  }

  // --- Texto: caractere a caractere, com rotação/tamanho/fonte/posição variados ---
  const chars = question.split("");
  const charWidth = (width - 20) / chars.length;

  chars.forEach((char, index) => {
    const fontSize = 26 + randomInt(8); // 26–33px
    const font = FONTS[randomInt(FONTS.length)];
    const rotation = (Math.random() - 0.5) * 2 * MAX_ROTATION;

    const x = 10 + charWidth * index + charWidth / 2;
    const y = height / 2 + (randomInt(17) - 8); // ±8px vertical

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.font = `${randomInt(2) ? "bold " : ""}${fontSize}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `hsl(${randomInt(360)}, 45%, ${15 + randomInt(20)}%)`;
    ctx.fillText(char, 0, 0);
    ctx.restore();
  });

  // --- Linhas de interferência POR CIMA do texto (obrigam segmentação) ---
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `hsla(${randomInt(360)}, 45%, ${25 + randomInt(30)}%, ${0.35 + Math.random() * 0.25})`;
    ctx.lineWidth = 0.8 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(randomInt(width), randomInt(height));
    ctx.lineTo(randomInt(width), randomInt(height));
    ctx.stroke();
  }

  const base64 = canvas.toBuffer("image/png").toString("base64");
  return { image: `data:image/png;base64,${base64}` };
}

/**
 * GET /api/math-captcha – gera a imagem PNG e guarda a resposta na sessão.
 * Pedir um novo captcha invalida o anterior (a resposta da sessão é
 * substituída antes do envio da nova imagem).
 */
export const serveMathCaptcha = (req: Request, res: Response) => {
  const { question, answer } = generateMath();
  req.session.mathCaptchaAnswer = answer.toString();
  res.json(renderToImage(question));
};
