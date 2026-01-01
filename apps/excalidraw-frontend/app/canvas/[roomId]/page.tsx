"use client"

import React, { useEffect, useRef, useState } from 'react'

type ShapeType = "rect" | "circle" | "line" | "diamond";

interface Shape {
    type: ShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    // For circle: x,y is center, width is radius
    // For line: x,y is start, width,height is end point offset
    // For diamond: x,y is center, width,height is size
}

const Page = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDark, setIsDark] = useState(false);
    const [selectedShape, setSelectedShape] = useState<ShapeType>("rect");
    const shapesRef = useRef<Shape[]>([]);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        const isDarkTheme = savedTheme === "dark";
        setIsDark(isDarkTheme);
        
        // Apply theme class on initial load
        if (isDarkTheme) {
            document.documentElement.classList.add("dark");
            document.body.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
            document.body.classList.remove("dark");
        }
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
            
            let clicked=false;

            let startX=0;
            let startY=0;

            const drawShape = (shape: Shape) => {
                switch (shape.type) {
                    case "rect":
                        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                        break;
                    case "circle":
                        ctx.beginPath();
                        const radius = Math.sqrt(shape.width ** 2 + shape.height ** 2);
                        ctx.arc(shape.x, shape.y, radius, 0, 2 * Math.PI);
                        ctx.stroke();
                        break;
                    case "line":
                        ctx.beginPath();
                        ctx.moveTo(shape.x, shape.y);
                        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
                        ctx.stroke();
                        break;
                    case "diamond":
                        ctx.beginPath();
                        ctx.moveTo(shape.x + shape.width / 2, shape.y);
                        ctx.lineTo(shape.x + shape.width, shape.y + shape.height / 2);
                        ctx.lineTo(shape.x + shape.width / 2, shape.y + shape.height);
                        ctx.lineTo(shape.x, shape.y + shape.height / 2);
                        ctx.closePath();
                        ctx.stroke();
                        break;
                }
            };

            const redrawAll = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = localStorage.getItem("theme") === "dark" ? "white" : "black";
                shapesRef.current.forEach(shape => drawShape(shape));
            };

            const getSelectedShape = (): ShapeType => {
                const select = document.getElementById('shape-select') as HTMLSelectElement;
                return (select?.value as ShapeType) || "rect";
            };

            canvas.addEventListener("mousedown",(e)=>{
                clicked=true
                startX=e.clientX;
                startY=e.clientY;
            })

            canvas.addEventListener("mouseup",(e)=>{
                clicked=false;
                const width = e.clientX - startX;
                const height = e.clientY - startY;
                if (width !== 0 || height !== 0) {
                    const shapeType = getSelectedShape();
                    shapesRef.current.push({ type: shapeType, x: startX, y: startY, width, height });
                }
            })
            canvas.addEventListener("mousemove",(e)=>{

                if(clicked){

                    let width=e.clientX-startX;
                    let height=e.clientY-startY;
                    redrawAll();
                    const shapeType = getSelectedShape();
                    drawShape({ type: shapeType, x: startX, y: startY, width, height });

                }
                
            })

            const observer = new MutationObserver(() => { redrawAll(); });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
            return () => observer.disconnect();
        }
      
    }, [canvasRef]);
    




  return (
    <div className="w-full h-full relative">
        <div className="absolute top-4 left-4 z-10">
            <select
                id="shape-select"
                value={selectedShape}
                onChange={(e) => setSelectedShape(e.target.value as ShapeType)}
                className="p-2 rounded-lg bg-surface border border-border hover:bg-muted transition-colors cursor-pointer"
            >
                <option value="rect">Rectangle</option>
                <option value="circle">Circle</option>
                <option value="line">Line</option>
                <option value="diamond">Diamond</option>
            </select>
        </div>
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
