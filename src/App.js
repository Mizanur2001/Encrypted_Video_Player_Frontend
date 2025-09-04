import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Verify from './pages/auth/Verify';
import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Verify/>} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
