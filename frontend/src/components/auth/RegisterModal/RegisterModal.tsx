import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import auth, { getApiErrorMessage } from "../../../service/Auth";
import "./RegisterModal.css";



type RegisterModalProps = {

  onLogin: () => void;
};

function RegisterModal({
  
  onLogin,
}: RegisterModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // controla a visibilidade das senhas
  const [showPassword, setShowPassword] = useState(false);
  // Recebe a imagem (data‑uri) do captcha gerada no backend
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // Load captcha question when the modal mounts
  const loadCaptcha = async () => {
    try {
      const image = await auth.getMathCaptcha();
      setCaptchaImage(image);
    } catch (_) {
      setCaptchaImage("");
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
        // valida se as senhas coincidem antes de enviar ao backend
        if (password !== confirmPassword) {
          setError("As senhas não coincidem.");
          setLoading(false);
          return;
        }
        await auth.register(name, email, password, confirmPassword, captchaAnswer);

      setSuccess("Cadastro realizado com sucesso!");

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Não foi possível realizar o cadastro. Tente novamente."
        )
      );

      // Captcha consumido pelo backend: limpa e recarrega a imagem
      setCaptchaAnswer("");
      loadCaptcha();
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

        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Senha"
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
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirmar Senha"
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
          <div className="register-modal__captcha">
            <img src={captchaImage} alt="captcha" className="register-modal__captcha-image" />
            <label className="register-modal__label" htmlFor="captcha-answer">
              Digite o resultado da operação
            </label>
            <input
              id="captcha-answer"
              type="text"
              className="register-modal__input"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              placeholder="Resposta"
              required
            />
          </div>
        )}
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