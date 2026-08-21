import "express-session";

declare module "express-session" {
  interface SessionData {
    /** Valor esperado da resposta do captcha gerado */
    mathCaptchaAnswer?: string;
  }
}
