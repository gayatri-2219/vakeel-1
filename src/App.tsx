import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Vault from './pages/Vault';
import Analyze from './pages/Analyze';
import HowItWorks from './pages/HowItWorks';
import Features from './pages/Features';
import Verify from './pages/Verify';
import Chat from './pages/Chat';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-[100dvh] flex flex-col font-sans bg-background text-foreground">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/analyze/:persona" element={<Analyze />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
