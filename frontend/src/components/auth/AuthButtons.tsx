import { useState } from "react";
import LoginModal from "./LoginModal/LoginModal";
import RegisterModal from "./RegisterModal/RegisterModal";
import ForgotPasswordModal from "./ForgotPasswordModal/ForgotPasswordModal";


function AuthButtons() {
  const [activeModal, setActiveModal] = useState<"login" | "register" | "forgot" | null>(null);

  return (
    <div>
      <button onClick={() => setActiveModal("login")}>Entrar</button>
      <button onClick={() => setActiveModal("register")}>Cadastrar</button>
      <button onClick={() => setActiveModal("forgot")}>Esqueci a senha</button>

      {activeModal === "login" && <LoginModal onClose={() => setActiveModal(null)} />}
      {activeModal === "register" && <RegisterModal onClose={() => setActiveModal(null)} />}
      {activeModal === "forgot" && <ForgotPasswordModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}

export default AuthButtons;