import { useState } from "react";
import auth from "../../../service/Auth";
import "../Modal.css"



type RegisterModalProps = {

  onLogin: () => void;
};

function RegisterModal({
  
  onLogin,
}: RegisterModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>
  ) {
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
      <form
        className="register-modal__form"
        onSubmit={handleRegister}
        noValidate
      >
        <h2 className="register-modal__title">
          Cadastrar
        </h2>

        {error && (
          <p className="register-modal__alert register-modal__alert--error">
            {error}
          </p>
        )}

        {success && (
          <p className="register-modal__alert register-modal__alert--success">
            {success}
          </p>
        )}

        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome"
          required
        />

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Senha"
          minLength={8}
          required
        />

        <button
          type="submit"
          disabled={loading}
        >
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>

        <button
          type="button"
          className="register-modal__login"
          onClick={onLogin}
        >
          Já tenho uma conta
        </button>
      </form>
    </div>
  );
}

export default RegisterModal;