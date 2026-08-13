import { useState } from "react";

import LoginModal from "./LoginModal/LoginModal";
import RegisterModal from "./RegisterModal/RegisterModal";
import ForgotPasswordModal from "./ForgotPasswordModal/ForgotPasswordModal";

import "../../styles/Global.css"
import "./AuthButtons.css";

type AuthOption = "login" | "register" | "forgot";

function AuthButtons() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeOption, setActiveOption] =
    useState<AuthOption>("login");

  function openModal(option: AuthOption) {
    setActiveOption(option);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  return (
    <>
      {/* BOTÃO PRINCIPAL */}

      <button
        type="button"
        className="auth-buttons__open"
        onClick={() => openModal("login")}
      >
        Entrar
      </button>

      {/* MODAL */}

      {modalOpen && (
        <div
          className="auth-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="auth-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* FECHAR */}

            <button
              type="button"
              className="auth-modal__close"
              onClick={closeModal}
              aria-label="Fechar"
            >
              ×
            </button>

            {/* LOGIN */}

            {activeOption === "login" && (
              <LoginModal
                onRegister={() =>
                  openModal("register")
                }
                onForgotPassword={() =>
                  openModal("forgot")
                }
              />
            )}

            {/* CADASTRO */}

            {activeOption === "register" && (
              <RegisterModal
                onLogin={() =>
                  openModal("login")
                }
              />
            )}

            {/* RECUPERAR SENHA */}

            {activeOption === "forgot" && (
              <ForgotPasswordModal
                onLogin={() =>
                  openModal("login")
                }
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default AuthButtons;