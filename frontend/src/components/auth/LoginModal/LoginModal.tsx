import { useState, type FormEvent } from "react";
import auth from "../../../service/Auth";
import "./LoginModal.css";

type LoginModalProps = {
  onClose?: () => void;
};

function LoginModal({ onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await auth.login(email, password);
      setSuccess(true);
      setEmail("");
      setPassword("");
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
      {onClose && (
        <button type="button" onClick={onClose} className="login-modal__close">
          Fechar
        </button>
      )}

      <form className="login-modal__form" onSubmit={handleLogin} noValidate>
        <h2 className="login-modal__title">Entrar</h2>

        {error && (
          <p className="login-modal__alert login-modal__alert--error">{error}</p>
        )}

        {success && (
          <p className="login-modal__alert login-modal__alert--success">
            Login realizado com sucesso!
          </p>
        )}

        <label className="login-modal__label" htmlFor="login-email">
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

        <label className="login-modal__label" htmlFor="login-password">
          Senha
        </label>
        <input
          id="login-password"
          type="password"
          className="login-modal__input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          minLength={8}
          required
        />

        <button className="login-modal__button" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default LoginModal;