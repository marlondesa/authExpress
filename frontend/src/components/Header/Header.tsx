
import AuthButtons from "../auth/AuthButtons";
import "./Header.css";

function Header() {
  return (
    <header className="header">
      <div className="auth">
        <AuthButtons />
      </div>
    </header>
  );
}

export default Header;