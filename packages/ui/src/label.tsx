"use client";

import { ReactNode, CSSProperties } from "react";

interface LabelProps {
  children: ReactNode;
  htmlFor?: string;
  mode?: 'light' | 'dark';
  className?: string;
  style?: CSSProperties;
}

export const Label = ({
  children,
  htmlFor,
  mode = 'light',
  className = '',
  style = {}
}: LabelProps) => {
  const isDark = mode === 'dark';
  
  return (
    <label
      htmlFor={htmlFor}
      className={className}
      style={{
        display: 'block',
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: '500',
        color: isDark ? '#e5e7eb' : '#374151',
        ...style
      }}
    >
      {children}
    </label>
  );
};
