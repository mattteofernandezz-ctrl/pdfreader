import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Forgot from './pages/Forgot';
import Home from './pages/Home';
import PDFViewer from './pages/PDFViewer';

function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <div id="app" className="mx-auto min-h-screen relative pb-20">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot" element={<Forgot />} />
            <Route path="/home" element={<Home />} />
            <Route path="/reader" element={<PDFViewer />} />
          </Routes>
        </div>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
