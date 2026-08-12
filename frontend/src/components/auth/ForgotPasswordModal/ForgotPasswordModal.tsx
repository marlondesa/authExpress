import { useState, type FormEvent } from "react";
import auth from "../../../service/Auth";
import "./ForgotPasswordModal.css";

type ForgotPasswordModalProps = {
    onClose?: () => void;
};

function ForgotPasswordModal({ onClose }: ForgotPasswordModalProps) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            await auth.forgotPassword(email);
            setSuccess("E-mail de redefinição enviado com sucesso.");
            setEmail("");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Não foi possível enviar o e-mail de recuperação."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="forgot-password-modal">
            {onClose && (
                <button type="button" onClick={onClose} className="forgot-password-modal__close">
                    Fechar
                </button>
            )}

            <form
                className="forgot-password-modal__form"
                onSubmit={handleForgotPassword}
                noValidate
            >
                <h2 className="forgot-password-modal__title">Recuperar senha</h2>

                {error && (
                    <p className="forgot-password-modal__alert forgot-password-modal__alert--error">
                        {error}
                    </p>
                )}

                {success && (
                    <p className="forgot-password-modal__alert forgot-password-modal__alert--success">
                        {success}
                    </p>
                )}

                <label className="forgot-password-modal__label" htmlFor="forgot-email">
                    E-mail
                </label>
                <input
                    id="forgot-email"
                    type="email"
                    className="forgot-password-modal__input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="seu@email.com"
                    required
                />

                <button className="forgot-password-modal__button"
                    type="submit" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar"}
                </button>
            </form>
        </div>
    );
}


export default ForgotPasswordModal;