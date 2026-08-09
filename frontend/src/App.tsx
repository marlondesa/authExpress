import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';

import './App.css';

function App() {
  return (
    <div className="app">

      {/* Cabeçalho */}
      <div className="header-container">
        <Header />
      </div>

      {/* Conteúdo principal */}
      <main className="main-container">
        <Home />
      </main>

      {/* Rodapé */}
      <div className="footer-container">
        <Footer />
      </div>

    </div>
  );
}

export default App;