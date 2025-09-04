import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Verify from './pages/auth/Verify';
import VideoPlayer from './pages/VideoPlayer/VideoPlayer';
import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<VideoPlayer />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/verify" element={<Verify />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
