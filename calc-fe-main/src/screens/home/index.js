import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ColorSwatch } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import { SWATCHES } from '@/constants';
export default function Home() {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [reset, setReset] = useState(false);
    const [dictOfVars, setDictOfVars] = useState({});
    const [result, setResult] = useState();
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [latexExpression, setLatexExpression] = useState([]);
    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);
    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);
    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;
            }
        }
        const script = document.createElement('script');
        script.src =
            'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);
        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
            });
        };
        return () => {
            document.head.removeChild(script);
        };
    }, []);
    const renderLatexToCanvas = (expression, answer) => {
        const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
        setLatexExpression((prev) => [...prev, latex]);
        // Clear the main canvas
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };
    const removeLatex = (index) => {
        setLatexExpression((prev) => prev.filter((_, i) => i !== index));
    };
    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };
    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.style.background = 'black';
            const ctx = canvas.getContext('2d');
            if (ctx) {
                let offsetX, offsetY;
                if ('touches' in e && e.touches.length > 0) {
                    // Touch event
                    const rect = canvas.getBoundingClientRect();
                    offsetX = e.touches[0].clientX - rect.left;
                    offsetY = e.touches[0].clientY - rect.top;
                }
                else if ('nativeEvent' in e) {
                    // Mouse event
                    offsetX = e.nativeEvent.offsetX;
                    offsetY = e.nativeEvent.offsetY;
                }
                else {
                    offsetX = 0;
                    offsetY = 0;
                }
                ctx.beginPath();
                ctx.moveTo(offsetX, offsetY);
                setIsDrawing(true);
            }
        }
    };
    const draw = (e) => {
        if (!isDrawing) {
            return;
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                let offsetX, offsetY;
                if ('touches' in e && e.touches.length > 0) {
                    const rect = canvas.getBoundingClientRect();
                    offsetX = e.touches[0].clientX - rect.left;
                    offsetY = e.touches[0].clientY - rect.top;
                }
                else if ('nativeEvent' in e) {
                    offsetX = e.nativeEvent.offsetX;
                    offsetY = e.nativeEvent.offsetY;
                }
                else {
                    offsetX = 0;
                    offsetY = 0;
                }
                ctx.strokeStyle = color;
                ctx.lineTo(offsetX, offsetY);
                ctx.stroke();
            }
        }
    };
    const stopDrawing = () => {
        setIsDrawing(false);
    };
    const runRoute = async () => {
        console.log('API URL:', import.meta.env.VITE_API_URL);
        const canvas = canvasRef.current;
        if (canvas) {
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars,
                },
            });
            const resp = await response.data;
            console.log('Response', resp);
            resp.data.forEach((data) => {
                if (data.assign === true) {
                    setDictOfVars({
                        ...dictOfVars,
                        [data.expr]: data.result,
                    });
                }
            });
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) {
                        // If pixel is not transparent
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            setLatexPosition({ x: centerX, y: centerY });
            resp.data.forEach((data) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result,
                    });
                }, 1000);
            });
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed top-4 left-1/2 transform -translate-x-1/2 z-30 bg-black/80 p-4 rounded-lg shadow-lg flex flex-col sm:flex-row items-center gap-4 w-[95%] sm:max-w-xl mx-auto", children: _jsxs("div", { className: "flex flex-col sm:flex-row items-center w-full gap-2 sm:gap-4", children: [_jsx(Button, { onClick: () => setReset(true), className: "bg-white text-black w-full sm:w-auto text-base py-2", children: "Reset" }), _jsx("div", { className: "flex flex-wrap justify-center gap-2", children: SWATCHES.map((swatch) => (_jsx(ColorSwatch, { color: swatch, onClick: () => setColor(swatch), style: {
                                    border: color === swatch ? '2px solid white' : 'none',
                                    cursor: 'pointer',
                                    width: '28px',
                                    height: '28px',
                                } }, swatch))) }), _jsx(Button, { onClick: runRoute, className: "bg-white text-black w-full sm:w-auto text-base py-2", children: "Run" })] }) }), _jsx("canvas", { ref: canvasRef, id: "canvas", className: "absolute top-0 left-0 w-full h-full touch-none", onMouseDown: startDrawing, onMouseMove: draw, onMouseUp: stopDrawing, onMouseOut: stopDrawing, onTouchStart: startDrawing, onTouchMove: (e) => {
                    e.preventDefault(); // prevent scrolling while drawing
                    draw(e);
                }, onTouchEnd: stopDrawing, onTouchCancel: stopDrawing }), latexExpression &&
                latexExpression.map((latex, index) => (_jsx(Draggable, { defaultPosition: latexPosition, onStop: (_, data) => setLatexPosition({ x: data.x, y: data.y }), children: _jsxs("div", { className: "absolute bg-black/80 p-3 text-white rounded shadow-lg animate-fadeIn max-w-xs text-sm backdrop-blur-sm", children: [_jsx("div", { className: "latex-content", children: latex }), _jsx("button", { onClick: () => removeLatex(index), className: "text-xs text-red-400 mt-2", children: "Remove" })] }) }, index)))] }));
}
