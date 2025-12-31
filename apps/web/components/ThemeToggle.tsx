"use client";

import { useTheme } from '../contexts/ThemeContext';
import { Button } from '@repo/ui/button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="sm"
      mode={theme}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        minWidth: '50px'
      }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </Button>
  );
}
