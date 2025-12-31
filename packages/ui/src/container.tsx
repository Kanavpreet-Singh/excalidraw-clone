"use client";

import { ReactNode, CSSProperties } from "react";

interface ContainerProps {
  children: ReactNode;
  maxWidth?: string;
  mode?: 'light' | 'dark';
  className?: string;
  style?: CSSProperties;
}

export const Container = ({
  children,
  maxWidth = '800px',
  mode = 'light',
  className = '',
  style = {}
}: ContainerProps) => {
  const isDark = mode === 'dark';
  
  return (
    <div
      className={className}
      style={{
        maxWidth,
        margin: '0 auto',
        padding: '20px',
        color: isDark ? '#e5e7eb' : '#374151',
        ...style
      }}
    >
      {children}
    </div>
  );
};
