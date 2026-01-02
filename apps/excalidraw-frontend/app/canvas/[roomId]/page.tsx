"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { config } from '@/config'

type ShapeType = "select" | "rect" | "circle" | "line" | "arrow" | "diamond" | "text" | "eraser";

interface Shape {
    id: string;
    type: ShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    // Text-specific properties
    text?: string;
    fontSize?: number;
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
    const [selectedShape, setSelectedShape] = useState<ShapeType>("select");
    const shapesRef = useRef<Shape[]>([]);
    const [toast, setToast] = useState({ message: '', show: false });
    const [isConnected, setIsConnected] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Text input state
    const [isTextMode, setIsTextMode] = useState(false);
    const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
    const [textValue, setTextValue] = useState('');
    const [fontSize, setFontSize] = useState(20);
    const textInputRef = useRef<HTMLInputElement>(null);
    
    // Ref for eraser function to avoid stale closure
    const eraseShapeAtRef = useRef<(x: number, y: number) => boolean>(() => false);
    
    // Drag and drop state refs
    const dragStateRef = useRef<{
        isDragging: boolean;
        shapeId: string | null;
        offsetX: number;
        offsetY: number;
    }>({ isDragging: false, shapeId: null, offsetX: 0, offsetY: 0 });
    
    // Find shape at position (returns shape or null)
    const findShapeAtRef = useRef<(x: number, y: number) => Shape | null>(() => null);

    // Handle canvas click for text mode
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (selectedShape === 'text' && !textInputPos) {
            e.preventDefault();
            e.stopPropagation();
            setTextInputPos({ x: e.clientX, y: e.clientY });
        }
    };

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
            case "arrow": {
                // Draw the line
                ctx.beginPath();
                ctx.moveTo(shape.x, shape.y);
                ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
                ctx.stroke();
                
                // Draw arrowhead
                const angle = Math.atan2(shape.height, shape.width);
                const headLength = 15;
                const headAngle = Math.PI / 6; // 30 degrees
                
                const endX = shape.x + shape.width;
                const endY = shape.y + shape.height;
                
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - headLength * Math.cos(angle - headAngle),
                    endY - headLength * Math.sin(angle - headAngle)
                );
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - headLength * Math.cos(angle + headAngle),
                    endY - headLength * Math.sin(angle + headAngle)
                );
                ctx.stroke();
                break;
            }
            case "diamond":
                ctx.beginPath();
                ctx.moveTo(shape.x + shape.width / 2, shape.y);
                ctx.lineTo(shape.x + shape.width, shape.y + shape.height / 2);
                ctx.lineTo(shape.x + shape.width / 2, shape.y + shape.height);
                ctx.lineTo(shape.x, shape.y + shape.height / 2);
                ctx.closePath();
                ctx.stroke();
                break;
            case "text":
                if (shape.text) {
                    const textFontSize = shape.fontSize || 20;
                    ctx.font = `${textFontSize}px sans-serif`;
                    ctx.fillStyle = localStorage.getItem("theme") === "dark" ? "white" : "black";
                    ctx.fillText(shape.text, shape.x, shape.y);
                }
                break;
        }
    };

    // Check if a point is inside/near a shape (for eraser hit detection)
    const isPointInShape = (px: number, py: number, shape: Shape, threshold: number = 10): boolean => {
        switch (shape.type) {
            case "rect": {
                // Normalize rect coordinates (handle negative width/height)
                const x = shape.width < 0 ? shape.x + shape.width : shape.x;
                const y = shape.height < 0 ? shape.y + shape.height : shape.y;
                const w = Math.abs(shape.width);
                const h = Math.abs(shape.height);
                
                // Check if point is near any edge of the rectangle
                const nearLeft = Math.abs(px - x) < threshold && py >= y - threshold && py <= y + h + threshold;
                const nearRight = Math.abs(px - (x + w)) < threshold && py >= y - threshold && py <= y + h + threshold;
                const nearTop = Math.abs(py - y) < threshold && px >= x - threshold && px <= x + w + threshold;
                const nearBottom = Math.abs(py - (y + h)) < threshold && px >= x - threshold && px <= x + w + threshold;
                
                return nearLeft || nearRight || nearTop || nearBottom;
            }
            case "circle": {
                const radius = Math.sqrt(shape.width ** 2 + shape.height ** 2);
                const distance = Math.sqrt((px - shape.x) ** 2 + (py - shape.y) ** 2);
                // Check if point is near the circle's circumference
                return Math.abs(distance - radius) < threshold;
            }
            case "line":
            case "arrow": {
                // Distance from point to line segment
                const x1 = shape.x;
                const y1 = shape.y;
                const x2 = shape.x + shape.width;
                const y2 = shape.y + shape.height;
                
                const A = px - x1;
                const B = py - y1;
                const C = x2 - x1;
                const D = y2 - y1;
                
                const dot = A * C + B * D;
                const lenSq = C * C + D * D;
                let param = lenSq !== 0 ? dot / lenSq : -1;
                
                let xx, yy;
                if (param < 0) {
                    xx = x1;
                    yy = y1;
                } else if (param > 1) {
                    xx = x2;
                    yy = y2;
                } else {
                    xx = x1 + param * C;
                    yy = y1 + param * D;
                }
                
                const distance = Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
                return distance < threshold;
            }
            case "diamond": {
                // Check if point is near any edge of the diamond
                const cx = shape.x + shape.width / 2;
                const cy = shape.y + shape.height / 2;
                const top = { x: shape.x + shape.width / 2, y: shape.y };
                const right = { x: shape.x + shape.width, y: shape.y + shape.height / 2 };
                const bottom = { x: shape.x + shape.width / 2, y: shape.y + shape.height };
                const left = { x: shape.x, y: shape.y + shape.height / 2 };
                
                // Check distance to each edge
                const edges = [
                    [top, right], [right, bottom], [bottom, left], [left, top]
                ];
                
                for (const [p1, p2] of edges) {
                    const A = px - p1.x;
                    const B = py - p1.y;
                    const C = p2.x - p1.x;
                    const D = p2.y - p1.y;
                    
                    const dot = A * C + B * D;
                    const lenSq = C * C + D * D;
                    let param = lenSq !== 0 ? dot / lenSq : -1;
                    
                    let xx, yy;
                    if (param < 0) {
                        xx = p1.x;
                        yy = p1.y;
                    } else if (param > 1) {
                        xx = p2.x;
                        yy = p2.y;
                    } else {
                        xx = p1.x + param * C;
                        yy = p1.y + param * D;
                    }
                    
                    const distance = Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
                    if (distance < threshold) return true;
                }
                return false;
            }
            case "text": {
                if (!shape.text) return false;
                const textFontSize = shape.fontSize || 20;
                // Approximate text bounding box
                const textWidth = shape.text.length * textFontSize * 0.6; // rough estimate
                const textHeight = textFontSize;
                
                return px >= shape.x - threshold && 
                       px <= shape.x + textWidth + threshold &&
                       py >= shape.y - textHeight - threshold && 
                       py <= shape.y + threshold;
            }
            default:
                return false;
        }
    };

    // Erase shape at position
    const eraseShapeAt = (x: number, y: number) => {
        // Find shape at position (check in reverse order - top shapes first)
        for (let i = shapesRef.current.length - 1; i >= 0; i--) {
            const shape = shapesRef.current[i];
            if (isPointInShape(x, y, shape)) {
                // Remove the shape
                const shapeId = shape.id;
                shapesRef.current.splice(i, 1);
                redrawCanvas();
                
                // Notify WebSocket server
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'remove-shape',
                        roomId,
                        shapeId
                    }));
                }
                return true; // Only erase one shape at a time
            }
        }
        return false;
    };
    
    // Keep ref in sync
    eraseShapeAtRef.current = eraseShapeAt;
    
    // Find shape at position (for drag and drop)
    const findShapeAt = (x: number, y: number): Shape | null => {
        // Check in reverse order - top shapes first
        for (let i = shapesRef.current.length - 1; i >= 0; i--) {
            const shape = shapesRef.current[i];
            if (isPointInShape(x, y, shape, 15)) {
                return shape;
            }
        }
        return null;
    };
    
    // Keep ref in sync
    findShapeAtRef.current = findShapeAt;
    
    // Update shape position (for drag and drop)
    const updateShapePosition = (shapeId: string, newX: number, newY: number) => {
        const idx = shapesRef.current.findIndex(s => s.id === shapeId);
        if (idx !== -1) {
            shapesRef.current[idx] = {
                ...shapesRef.current[idx],
                x: newX,
                y: newY
            };
            redrawCanvas();
        }
    };
    
    // Send shape update to WebSocket
    const sendShapeUpdate = (shape: Shape) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'update-shape',
                roomId,
                shape
            }));
        }
    };

    // Handle text submission
    const handleTextSubmit = () => {
        if (textInputPos && textValue.trim()) {
            const newShape: Shape = {
                id: generateId(),
                type: 'text',
                x: textInputPos.x,
                y: textInputPos.y,
                width: 0,
                height: 0,
                text: textValue,
                fontSize: fontSize
            };
            
            shapesRef.current.push(newShape);
            redrawCanvas();
            
            // Publish text shape to WebSocket server
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'add-shape',
                    roomId,
                    shape: newShape
                }));
            }
        }
        
        // Reset text input state
        setTextInputPos(null);
        setTextValue('');
    };

    // Cancel text input
    const handleTextCancel = () => {
        setTextInputPos(null);
        setTextValue('');
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
            const shapeType = getSelectedShape();
            
            // Select mode - start dragging if clicking on a shape
            if (shapeType === 'select') {
                const shape = findShapeAtRef.current(e.clientX, e.clientY);
                if (shape) {
                    dragStateRef.current = {
                        isDragging: true,
                        shapeId: shape.id,
                        offsetX: e.clientX - shape.x,
                        offsetY: e.clientY - shape.y
                    };
                    canvas.style.cursor = 'grabbing';
                }
                return;
            }
            
            // Text mode is handled by React event handler
            if (shapeType === 'text') {
                return;
            }
            
            // Eraser mode - erase on mouse down
            if (shapeType === 'eraser') {
                eraseShapeAtRef.current(e.clientX, e.clientY);
            }
            
            clicked = true;
            startX = e.clientX;
            startY = e.clientY;
        };

        const handleMouseUp = (e: MouseEvent) => {
            clicked = false;
            const shapeType = getSelectedShape();
            
            // Select mode - end dragging
            if (shapeType === 'select') {
                if (dragStateRef.current.isDragging && dragStateRef.current.shapeId) {
                    // Find the shape and send update
                    const shape = shapesRef.current.find(s => s.id === dragStateRef.current.shapeId);
                    if (shape) {
                        // Send WebSocket update
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify({
                                type: 'update-shape',
                                roomId,
                                shape
                            }));
                        }
                    }
                }
                dragStateRef.current = { isDragging: false, shapeId: null, offsetX: 0, offsetY: 0 };
                canvas.style.cursor = 'default';
                return;
            }
            
            // Text mode is handled differently (click to place)
            if (shapeType === 'text') return;
            
            // Eraser mode doesn't create shapes
            if (shapeType === 'eraser') return;
            
            const width = e.clientX - startX;
            const height = e.clientY - startY;
            
            if (width !== 0 || height !== 0) {
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
            const shapeType = getSelectedShape();
            
            // Select mode - handle dragging
            if (shapeType === 'select') {
                if (dragStateRef.current.isDragging && dragStateRef.current.shapeId) {
                    const newX = e.clientX - dragStateRef.current.offsetX;
                    const newY = e.clientY - dragStateRef.current.offsetY;
                    
                    // Update shape position
                    const idx = shapesRef.current.findIndex(s => s.id === dragStateRef.current.shapeId);
                    if (idx !== -1) {
                        shapesRef.current[idx] = {
                            ...shapesRef.current[idx],
                            x: newX,
                            y: newY
                        };
                        redrawCanvas();
                    }
                } else {
                    // Change cursor when hovering over a shape
                    const shape = findShapeAtRef.current(e.clientX, e.clientY);
                    canvas.style.cursor = shape ? 'grab' : 'default';
                }
                return;
            }
            
            if (clicked) {
                // Don't draw preview for text mode
                if (shapeType === 'text') return;
                
                // Eraser mode - continuously erase while dragging
                if (shapeType === 'eraser') {
                    eraseShapeAtRef.current(e.clientX, e.clientY);
                    return;
                }
                
                const width = e.clientX - startX;
                const height = e.clientY - startY;
                redrawCanvas();
                ctx.strokeStyle = localStorage.getItem("theme") === "dark" ? "white" : "black";
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

            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 p-2 bg-surface border border-border rounded-lg shadow-lg">
                {/* Tool buttons */}
                {[
                    { type: 'select' as ShapeType, label: 'Select & Move', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
                            <path d="M13 13l6 6"/>
                        </svg>
                    )},
                    { type: 'rect' as ShapeType, label: 'Rectangle', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                        </svg>
                    )},
                    { type: 'circle' as ShapeType, label: 'Circle', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                    )},
                    { type: 'line' as ShapeType, label: 'Line', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="19" x2="19" y2="5"/>
                        </svg>
                    )},
                    { type: 'arrow' as ShapeType, label: 'Arrow', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="19" x2="19" y2="5"/>
                            <polyline points="10 5 19 5 19 14"/>
                        </svg>
                    )},
                    { type: 'diamond' as ShapeType, label: 'Diamond', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2 L22 12 L12 22 L2 12 Z"/>
                        </svg>
                    )},
                    { type: 'text' as ShapeType, label: 'Text', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 7V4h16v3"/>
                            <line x1="12" y1="4" x2="12" y2="20"/>
                            <line x1="8" y1="20" x2="16" y2="20"/>
                        </svg>
                    )},
                    { type: 'eraser' as ShapeType, label: 'Eraser', icon: (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 20H7L3 16a1 1 0 0 1 0-1.4l9.9-9.9a1 1 0 0 1 1.4 0l5.3 5.3a1 1 0 0 1 0 1.4L11 20"/>
                            <path d="m6.5 17.5 5-5"/>
                        </svg>
                    )},
                ].map((tool) => (
                    <button
                        key={tool.type}
                        onClick={() => {
                            setSelectedShape(tool.type);
                            setIsTextMode(tool.type === 'text');
                            if (tool.type !== 'text') {
                                setTextInputPos(null);
                                setTextValue('');
                            }
                        }}
                        className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                            selectedShape === tool.type 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
                        }`}
                        title={tool.label}
                        aria-label={tool.label}
                    >
                        {tool.icon}
                    </button>
                ))}
                
                {/* Font size selector - only show when text mode is selected */}
                {isTextMode && (
                    <select
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="mt-1 p-1 text-sm rounded bg-muted border border-border cursor-pointer"
                        title="Font Size"
                    >
                        <option value={12}>12</option>
                        <option value={16}>16</option>
                        <option value={20}>20</option>
                        <option value={24}>24</option>
                        <option value={32}>32</option>
                        <option value={48}>48</option>
                        <option value={64}>64</option>
                    </select>
                )}
            </div>
            
            {/* Hidden select for getSelectedShape function */}
            <select
                id="shape-select"
                value={selectedShape}
                onChange={() => {}}
                className="hidden"
            >
                <option value="select">Select</option>
                <option value="rect">Rectangle</option>
                <option value="circle">Circle</option>
                <option value="line">Line</option>
                <option value="arrow">Arrow</option>
                <option value="diamond">Diamond</option>
                <option value="text">Text</option>
                <option value="eraser">Eraser</option>
            </select>
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
        <canvas 
            className="w-full h-full block" 
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ cursor: selectedShape === 'select' ? 'default' : selectedShape === 'text' ? 'text' : selectedShape === 'eraser' ? 'not-allowed' : 'crosshair' }}
        ></canvas>
            
            {/* Text input overlay */}
            {textInputPos && (
                <>
                    {/* Blinking cursor indicator at click position */}
                    <div 
                        className="absolute z-20 w-0.5 bg-primary animate-pulse"
                        style={{ 
                            left: textInputPos.x, 
                            top: textInputPos.y - fontSize,
                            height: fontSize + 4
                        }}
                    />
                    <div
                        className="absolute z-20"
                        style={{ left: textInputPos.x + 4, top: textInputPos.y - fontSize - 4 }}
                    >
                        <input
                            ref={textInputRef}
                            type="text"
                            value={textValue}
                            onChange={(e) => setTextValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleTextSubmit();
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleTextCancel();
                                }
                            }}
                            onBlur={(e) => {
                                // Delay to allow button clicks etc.
                                setTimeout(() => handleTextSubmit(), 100);
                            }}
                            placeholder="Type here..."
                            autoFocus
                            className="px-1 py-0 border-2 border-primary rounded bg-surface text-foreground shadow-lg outline-none"
                            style={{ fontSize: `${fontSize}px`, minWidth: '150px' }}
                        />
                    </div>
                </>
            )}
    </div>
  )
}

export default Page
