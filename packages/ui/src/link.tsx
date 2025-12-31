"use client";

import { ReactNode, CSSProperties } from "react";

interface LinkProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  mode?: 'light' | 'dark';
  className?: string;
  style?: CSSProperties;
}

export const Link = ({
  children,
  href,
  onClick,
  mode = 'light',
  className = '',
  style = {}
}: LinkProps) => {
  const isDark = mode === 'dark';
  
  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      style={{
        color: '#0070f3',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecoration = 'underline';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = 'none';
      }}
    >
      {children}
    </a>
  );
};
