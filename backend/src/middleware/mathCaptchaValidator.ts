import { Request, Response, NextFunction } from "express";

/**
 * Verifica se o campo `captchaAnswer` enviado no body corresponde ao valor
 * armazenado na sessão (`req.session.mathCaptchaAnswer`).
 * O valor da sessão é removido logo após a verificação para impedir replay.
 */
export const verifyMathCaptcha = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const submitted = (req.body.captchaAnswer ?? "").toString().trim();
  // @ts-ignore – a sessão pode ter campos dinâmicos
  const expected = (req.session.mathCaptchaAnswer ?? "").toString().trim();

  // limpa a resposta da sessão (não pode ser reutilizada)
  // @ts-ignore
  req.session.mathCaptchaAnswer = null;

  if (!expected) {
    return res
      .status(400)
      .json({ error: "Captcha não encontrado. Recarregue a página." });
  }
  if (submitted !== expected) {
    return res.status(403).json({ error: "Captcha incorreto." });
  }
  next();
};
