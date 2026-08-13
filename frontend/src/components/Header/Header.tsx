
import AuthButtons from "../auth/AuthButtons";



//cores 
import "./Header.css";
import "../../styles/Global.css"




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