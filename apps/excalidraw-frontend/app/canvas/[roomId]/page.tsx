"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { config } from '@/config'

type ShapeType = "rect" | "circle" | "line" | "diamond";

interface Shape {
    id: string;
    type: ShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
}

// Toast component (simple inline implementation)
const Toast = ({ message, show }: { message: string; show: boolean }) => {
    if (!show) return null;
    return (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg animate-fade-in">
            {message}
        </div>
    );
};

const Page = () => {
    const params = useParams();
    const roomId = params.roomId as string;
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [isDark, setIsDark] = useState(false);
    const [selectedShape, setSelectedShape] = useState<ShapeType>("rect");
    const shapesRef = useRef<Shape[]>([]);
    const [toast, setToast] = useState({ message: '', show: false });
    const [isConnected, setIsConnected] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Generate unique ID for shapes
    const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Show toast message
    const showToast = (message: string) => {
        setToast({ message, show: true });
        setTimeout(() => setToast({ message: '', show: false }), 3000);
    };

    // Theme setup
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        const isDarkTheme = savedTheme === "dark";
        setIsDark(isDarkTheme);
        
        if (isDarkTheme) {
            document.documentElement.classList.add("dark");
            document.body.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
            document.body.classList.remove("dark");
        }
    }, []);

    // WebSocket connection
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token || !roomId) return;

        const ws = new WebSocket(`${config.WS_URL}?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected');
            // Join room on connection
            ws.send(JSON.stringify({ type: 'join-room', roomId }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('WS message:', data.type);

            switch (data.type) {
                case 'joined-room':
                    setIsConnected(true);
                    showToast(`Joined room successfully!`);
                    // Load existing shapes from server
                    if (data.shapes && Array.isArray(data.shapes)) {
                        shapesRef.current = data.shapes;
                        redrawCanvas();
                    }
                    break;

                case 'shape-added':
                    // Add new shape from another user
                    const existingShape = shapesRef.current.find(s => s.id === data.shape.id);
                    if (!existingShape) {
                        shapesRef.current.push(data.shape);
                        redrawCanvas();
                    }
                    break;

                case 'shape-removed':
                    shapesRef.current = shapesRef.current.filter(s => s.id !== data.shapeId);
                    redrawCanvas();
                    break;

                case 'shape-updated':
                    const idx = shapesRef.current.findIndex(s => s.id === data.shape.id);
                    if (idx !== -1) {
                        shapesRef.current[idx] = data.shape;
                        redrawCanvas();
                    }
                    break;

                case 'shapes-synced':
                    shapesRef.current = data.shapes;
                    redrawCanvas();
                    break;

                case 'user-joined':
                    showToast(`User ${data.userId} joined the room`);
                    break;

                case 'user-left':
                    showToast(`User ${data.userId} left the room`);
                    break;

                case 'save-result':
                    setIsSaving(false);
                    showToast(data.success ? 'Saved!' : 'Failed to save');
                    break;

                case 'unload-ack':
                    console.log('Unload acknowledged by server');
                    break;

                case 'error':
                    showToast(`Error: ${data.message}`);
                    break;
            }
        };

        ws.onclose = (event) => {
            console.log('WebSocket disconnected', event.code, event.reason);
            setIsConnected(false);
        };

        ws.onerror = () => {
            // WebSocket onerror doesn't provide useful info, actual errors come via onclose
            // Only log if not connected yet (real connection failure)
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                console.warn('WebSocket connection issue - will retry or check server');
            }
        };

        // Handle browser tab close/refresh - best effort save
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (ws.readyState === WebSocket.OPEN) {
                // Send unload message - best effort, no guarantee it arrives
                ws.send(JSON.stringify({ type: 'unload' }));
            }
            // Show browser confirmation dialog if shapes exist
            if (shapesRef.current.length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup on unmount
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'leave-room', roomId }));
            }
            ws.close();
        };
    }, [roomId]);

    // Helper to redraw canvas
    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = localStorage.getItem("theme") === "dark" ? "white" : "black";
        shapesRef.current.forEach(shape => drawShape(ctx, shape));
    };

    // Draw individual shape
    const drawShape = (ctx: CanvasRenderingContext2D, shape: Shape) => {
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

    // Manual save function
    const handleSave = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            setIsSaving(true);
            wsRef.current.send(JSON.stringify({ type: 'save', roomId }));
        } else {
            showToast('Not connected - cannot save');
        }
    };

    // Keyboard shortcut for Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [roomId]);

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

    // Canvas drawing logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.strokeStyle = localStorage.getItem("theme") === "dark" ? "white" : "black";
        
        let clicked = false;
        let startX = 0;
        let startY = 0;

        const getSelectedShape = (): ShapeType => {
            const select = document.getElementById('shape-select') as HTMLSelectElement;
            return (select?.value as ShapeType) || "rect";
        };

        const handleMouseDown = (e: MouseEvent) => {
            clicked = true;
            startX = e.clientX;
            startY = e.clientY;
        };

        const handleMouseUp = (e: MouseEvent) => {
            clicked = false;
            const width = e.clientX - startX;
            const height = e.clientY - startY;
            
            if (width !== 0 || height !== 0) {
                const shapeType = getSelectedShape();
                const newShape: Shape = {
                    id: generateId(),
                    type: shapeType,
                    x: startX,
                    y: startY,
                    width,
                    height
                };
                
                shapesRef.current.push(newShape);
                
                // Publish shape to WebSocket server
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'add-shape',
                        roomId,
                        shape: newShape
                    }));
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (clicked) {
                const width = e.clientX - startX;
                const height = e.clientY - startY;
                redrawCanvas();
                ctx.strokeStyle = localStorage.getItem("theme") === "dark" ? "white" : "black";
                const shapeType = getSelectedShape();
                drawShape(ctx, { id: '', type: shapeType, x: startX, y: startY, width, height });
            }
        };

        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mouseup", handleMouseUp);
        canvas.addEventListener("mousemove", handleMouseMove);

        // Theme change observer
        const observer = new MutationObserver(() => { redrawCanvas(); });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => {
            canvas.removeEventListener("mousedown", handleMouseDown);
            canvas.removeEventListener("mouseup", handleMouseUp);
            canvas.removeEventListener("mousemove", handleMouseMove);
            observer.disconnect();
        };
    }, [roomId]);

    return (
        <div className="w-full h-full relative">
            <Toast message={toast.message} show={toast.show} />
            
            {/* Connection status indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-full text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-muted-foreground">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>

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
            {/* Top right controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                {/* Save button */}
                <button
                    onClick={handleSave}
                    disabled={isSaving || !isConnected}
                    className="p-2 rounded-lg bg-surface border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    aria-label="Save (Ctrl+S)"
                    title="Save (Ctrl+S)"
                >
                    {isSaving ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17 21 17 13 7 13 7 21"/>
                            <polyline points="7 3 7 8 15 8"/>
                        </svg>
                    )}
                </button>

                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg bg-surface border border-border hover:bg-muted transition-colors"
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
            </div>
        <canvas className="w-full h-full block" ref={canvasRef}></canvas>
    </div>
  )
}

export default Page
