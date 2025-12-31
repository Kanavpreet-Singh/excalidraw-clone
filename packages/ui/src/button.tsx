"use client";

import { ReactNode, CSSProperties } from "react";

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  mode?: 'light' | 'dark';
  className?: string;
  style?: CSSProperties;
}

export const Button = ({ 
  children, 
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  size = 'md',
  mode = 'light',
  className = '',
  style = {}
}: ButtonProps) => {
  const getVariantStyles = (): CSSProperties => {
    const isDark = mode === 'dark';
    
    const variants = {
      primary: {
        background: isDark ? '#0070f3' : '#0070f3',
        color: 'white',
        border: 'none',
      },
      secondary: {
        background: isDark ? '#374151' : '#6c757d',
        color: 'white',
        border: 'none',
      },
      danger: {
        background: isDark ? '#dc2626' : '#dc3545',
        color: 'white',
        border: 'none',
      },
      success: {
        background: isDark ? '#16a34a' : '#28a745',
        color: 'white',
        border: 'none',
      },
      ghost: {
        background: 'transparent',
        color: isDark ? '#e5e7eb' : '#374151',
        border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
      }
    };
    
    return variants[variant];
  };
  
  const getSizeStyles = (): CSSProperties => {
    const sizes = {
      sm: { padding: '6px 12px', fontSize: '14px' },
      md: { padding: '10px 20px', fontSize: '16px' },
      lg: { padding: '14px 28px', fontSize: '18px' }
    };
    
    return sizes[size];
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        ...getVariantStyles(),
        ...getSizeStyles(),
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s',
        fontWeight: '500',
        ...style
      }}
    >
      {children}
    </button>
  );
};
