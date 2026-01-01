"use client"

import React, { useEffect, useRef, useState } from 'react'

const Page = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        setIsDark(localStorage.getItem("theme") === "dark");
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        if (newTheme) {
            document.documentElement.classList.add("dark");
            document.body.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            document.body.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    useEffect(() => {

        if(canvasRef.current){
            const canvas=canvasRef.current;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.strokeStyle = localStorage.getItem("theme") === "dark" ? "white" : "black";
            
            
            ctx.strokeRect(0,0,100,100);
            
        }
      
        const observer = new MutationObserver(() => { if(canvasRef.current) { const ctx = canvasRef.current.getContext("2d"); if(ctx) { ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height); ctx.strokeStyle = localStorage.getItem("theme") === "dark" ? "white" : "black"; ctx.strokeRect(0,0,100,100); }}});
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
      
    }, [canvasRef]);
    




  return (
    <div className="w-full h-full relative">
        <button
            onClick={toggleTheme}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-surface border border-border hover:bg-muted transition-colors"
            aria-label="Toggle theme"
        >
            {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            )}
        </button>
        <canvas className="w-full h-full block" ref={canvasRef}></canvas>
    </div>
  )
}

export default Page
