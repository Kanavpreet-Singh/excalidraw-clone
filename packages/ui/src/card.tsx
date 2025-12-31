"use client";

import { type JSX, type ReactNode, CSSProperties } from "react";

export function Card({
  className = '',
  title,
  children,
  onClick,
  mode = 'light',
  style = {}
}: {
  className?: string;
  title?: string;
  children: ReactNode;
  onClick?: () => void;
  mode?: 'light' | 'dark';
  style?: CSSProperties;
}): JSX.Element {
  const isDark = mode === 'dark';
  
  const cardStyle: CSSProperties = {
    padding: '24px',
    background: isDark ? '#1f2937' : '#ffffff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    borderRadius: '8px',
    color: isDark ? '#e5e7eb' : '#374151',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s',
    ...style
  };
  
  const Component = onClick ? 'div' : 'div';
  
  return (
    <Component
      className={className}
      onClick={onClick}
      style={cardStyle}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = isDark 
            ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
            : '0 4px 12px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {title && (
        <h3 style={{ 
          marginBottom: '12px', 
          fontSize: '20px', 
          fontWeight: '600',
          color: isDark ? '#f3f4f6' : '#1f2937'
        }}>
          {title}
        </h3>
      )}
      {children}
    </Component>
  );
}
