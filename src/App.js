import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import Login from './pages/auth/Login';
import Verify from './pages/auth/Verify';
import VideoPlayer from './pages/VideoPlayer/VideoPlayer';
import './App.css';

function App() {
  return (
    <div className="App">
      <Toaster richColors />
      <Router>
        <Routes>
          <Route path="/" element={localStorage.getItem("evp_token") ? <VideoPlayer /> : <Login />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/verify" element={<Verify />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
