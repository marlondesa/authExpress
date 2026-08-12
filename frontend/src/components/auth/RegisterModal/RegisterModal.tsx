import { useState, type FormEvent } from "react";
import auth from "../../../service/Auth";
import "./RegisterModal.css";

type RegisterModalProps = {
  onClose?: () => void;
};

function RegisterModal({ onClose }: RegisterModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    setLoading(true);

    try {
      await auth.register(name, email, password);
      setSuccess("Cadastro realizado com sucesso!");
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível realizar o cadastro. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-modal">
      {onClose && (
        <button type="button" onClick={onClose} className="register-modal__close">
          Fechar
        </button>
      )}

      <form className="register-modal__form" onSubmit={handleRegister} noValidate>
        <h2 className="register-modal__title">Cadastrar</h2>

        {error && <p className="register-modal__alert register-modal__alert--error">{error}</p>}
        {success && (
          <p className="register-modal__alert register-modal__alert--success">
            {success}
          </p>
        )}

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
        />

        <button type="submit" disabled={loading}>
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>
    </div>
  );
}

export default RegisterModal;