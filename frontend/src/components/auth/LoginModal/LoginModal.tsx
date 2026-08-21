import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import auth from "../../../service/Auth";
import "./LoginModal.css";




type LoginModalProps = {
  onRegister: () => void;
  onForgotPassword: () => void;
};

function LoginModal({
  // onClose,
  onRegister,
  onForgotPassword,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Recebe a imagem (data‑uri) do captcha gerada no backend
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load captcha question when the modal mounts
  useEffect(() => {
    const loadCaptcha = async () => {
      try {
        const image = await auth.getMathCaptcha();
        setCaptchaImage(image);
      } catch (_) {
        // If captcha fails to load we still allow login (backend will reject without answer)
        setCaptchaImage("");
      }
    };
    loadCaptcha();
  }, []);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await auth.login(email, password, captchaAnswer);

      setSuccess(true);

      setEmail("");
      setPassword("");
      setCaptchaAnswer("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível fazer login. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-modal">
      <form
        className="login-modal__form"
        onSubmit={handleLogin}
        noValidate
      >
        <h2 className="login-modal__title">
          Entrar
        </h2>

        {error && (
          <p className="login-modal__alert login-modal__alert--error">
            {error}
          </p>
        )}

        {success && (
          <p className="login-modal__alert login-modal__alert--success">
            Login realizado com sucesso!
          </p>
        )}

        <label
          className="login-modal__label"
          htmlFor="login-email"
        >
          E-mail
        </label>

        <input
          id="login-email"
          type="email"
          className="login-modal__input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu@email.com"
          required
        />

        <label
          className="login-modal__label"
          htmlFor="login-password"
        >
          Senha
        </label>

        <div className="password-field">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            className="login-modal__input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
          />
          <button
            type="button"
            className="show-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {captchaImage && (
          <div className="login-modal__captcha">
            <img src={captchaImage} alt="captcha" className="login-modal__captcha-image" />
            <label className="login-modal__label" htmlFor="captcha-answer">
              Digite o resultado da operação
            </label>
            <input
              id="captcha-answer"
              type="text"
              className="login-modal__input"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              placeholder="Resposta"
              required
            />
          </div>
        )}

        <button
          className="login-modal__button"
          type="submit"
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button
          type="button"
          className="login-modal__link"
          onClick={onForgotPassword}
        >
          Esqueci minha senha
        </button>

        <button
          type="button"
          className="login-modal__link"
          onClick={onRegister}
        >
          Criar uma conta
        </button>
      </form>
    </div>
  );
}

export default LoginModal;