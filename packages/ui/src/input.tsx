"use client";

import { CSSProperties, ChangeEvent } from "react";

interface InputProps {
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  mode?: 'light' | 'dark';
  className?: string;
  style?: CSSProperties;
  id?: string;
}

export const Input = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  mode = 'light',
  className = '',
  style = {},
  id
}: InputProps) => {
  const isDark = mode === 'dark';
  
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={className}
      style={{
        width: '100%',
        padding: '12px',
        fontSize: '16px',
        border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
        borderRadius: '6px',
        background: isDark ? '#1f2937' : '#ffffff',
        color: isDark ? '#e5e7eb' : '#374151',
        outline: 'none',
        transition: 'all 0.2s',
        ...style
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#0070f3';
        e.target.style.boxShadow = '0 0 0 3px rgba(0, 112, 243, 0.1)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = isDark ? '#4b5563' : '#d1d5db';
        e.target.style.boxShadow = 'none';
      }}
    />
  );
};
