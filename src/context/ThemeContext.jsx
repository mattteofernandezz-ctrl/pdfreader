import { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

const THEMES = {
  night: { bg: '#10002B', card: '#240046', primary: '#8B5CF6', text: '#E0E0E0', icon: '#E0AAFF' },
  day: { bg: '#F8FAFC', card: '#FFFFFF', primary: '#6366F1', text: '#111827', icon: '#6366F1' },
  black: { bg: '#000000', card: '#000000', primary: '#8B5CF6', text: '#FFFFFF', icon: '#E0AAFF' },
  contrast: { bg: '#000000', card: '#000000', primary: '#FFFF00', text: '#FFFFFF', icon: '#FFFF00' }
};

export const ThemeProvider = ({ children }) => {
  const [currentMode, setCurrentMode] = useState(localStorage.getItem('librook_mode') || 'night');

  useEffect(() => {
    const t = THEMES[currentMode] || THEMES.night;
    document.documentElement.style.setProperty('--bg', t.bg);
    document.documentElement.style.setProperty('--card', t.card);
    document.documentElement.style.setProperty('--primary', t.primary);
    document.documentElement.style.setProperty('--text', t.text);
    document.documentElement.style.setProperty('--icon', t.icon);
    
    // Adjust text contrast for Day mode
    if (currentMode === 'day') {
      document.documentElement.style.setProperty('--text', '#111827');
    } else {
      document.documentElement.style.setProperty('--text', '#E0E0E0');
    }

    localStorage.setItem('librook_mode', currentMode);
  }, [currentMode]);

  return (
    <ThemeContext.Provider value={{ currentMode, setCurrentMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
