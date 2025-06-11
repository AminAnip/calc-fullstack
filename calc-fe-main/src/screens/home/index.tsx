import { ColorSwatch } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import { SWATCHES } from '@/constants';

interface GeneratedResult {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('rgb(255, 255, 255)');
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GeneratedResult>();
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Memoize MathJax setup to prevent re-initialization
  const setupMathJax = useCallback(() => {
    if (window.MathJax && latexExpression.length > 0) {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
      });
    }
  }, [latexExpression.length]);

  useEffect(() => {
    setupMathJax();
  }, [setupMathJax]);

  // Optimize canvas rendering
  const renderLatexToCanvas = useCallback((expression: string, answer: string) => {
    const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
    setLatexExpression((prev) => [...prev, latex]);

    // Use cached context reference for faster clearing
    if (contextRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result, renderLatexToCanvas]);

  // Optimized reset function
  const resetCanvas = useCallback(() => {
    if (contextRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.background = 'black';
    }
    setLatexExpression([]);
    setResult(undefined);
    setDictOfVars({});
    setReset(false);
  }, []);

  useEffect(() => {
    if (reset) {
      resetCanvas();
    }
  }, [reset, resetCanvas]);

  // Initialize canvas only once with better performance settings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', {
        alpha: false, // Better performance for opaque canvas
        desynchronized: true // Allow GPU acceleration
      });
      
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Cache the context reference
        contextRef.current = ctx;
      }
    }

    // Load MathJax only once
    if (!window.MathJax) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
      script.async = true;
      document.head.appendChild(script);

      script.onload = () => {
        window.MathJax.Hub.Config({
          tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
        });
      };

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, []);

  // Optimized coordinate extraction
  const getCoordinates = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    if ('touches' in e && e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('nativeEvent' in e) {
      const mouseEvent = e as React.MouseEvent;
      return {
        x: mouseEvent.nativeEvent.offsetX,
        y: mouseEvent.nativeEvent.offsetY
      };
    }
    return { x: 0, y: 0 };
  }, []);

  const startDrawing = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    if (canvas && ctx) {
      const coords = getCoordinates(e, canvas);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    }
  }, [getCoordinates]);

  const draw = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    if (canvas && ctx) {
      const coords = getCoordinates(e, canvas);
      ctx.strokeStyle = color;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  }, [isDrawing, color, getCoordinates]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Optimized bounding box calculation
  const calculateBoundingBox = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

    // Optimized pixel scanning
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }, []);

  // Debounced API call with better error handling
  const runRoute = useCallback(async () => {
    if (isProcessing) return; // Prevent multiple simultaneous calls
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);
    
    try {
      console.log('API URL:', import.meta.env.VITE_API_URL);

      const response = await axios({
        method: 'post',
        url: `${import.meta.env.VITE_API_URL}/calculate`,
        data: {
          image: canvas.toDataURL('image/png'),
          dict_of_vars: dictOfVars,
        },
        timeout: 10000 // 10 second timeout
      });

      const resp = response.data;
      console.log('Response', resp);
      
      // Batch state updates for better performance
      const newVars: Record<string, string> = { ...dictOfVars };
      resp.data.forEach((data: Response) => {
        if (data.assign === true) {
          newVars[data.expr] = data.result;
        }
      });
      setDictOfVars(newVars);

      const ctx = contextRef.current;
      if (ctx) {
        const { centerX, centerY } = calculateBoundingBox(canvas, ctx);
        setLatexPosition({ x: centerX, y: centerY });

        // Process results without delay for faster response
        resp.data.forEach((data: Response) => {
          setResult({
            expression: data.expr,
            answer: data.result,
          });
        });
      }
    } catch (error) {
      console.error('API call failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [dictOfVars, isProcessing, calculateBoundingBox]);

  // Memoize color swatches to prevent re-rendering
  const colorSwatches = useMemo(() => 
    SWATCHES.map((swatch) => (
      <ColorSwatch
        key={swatch}
        color={swatch}
        onClick={() => setColor(swatch)}
        style={{
          border: color === swatch ? '2px solid white' : 'none',
          cursor: 'pointer',
          width: '28px',
          height: '28px',
        }}
      />
    )), [color]
  );

  return (
    <>
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-30 bg-black/80 p-4 rounded-lg shadow-lg flex flex-col sm:flex-row items-center gap-4 w-[95%] sm:max-w-xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center w-full gap-2 sm:gap-4">
          <Button
            onClick={() => setReset(true)}
            className="bg-white text-black w-full sm:w-auto text-base py-2"
            disabled={isProcessing}
          >
            Reset
          </Button>

          <div className="flex flex-wrap justify-center gap-2">
            {colorSwatches}
          </div>

          <Button
            onClick={runRoute}
            className="bg-white text-black w-full sm:w-auto text-base py-2"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Run'}
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={(e) => {
          e.preventDefault();
          draw(e);
        }}
        onTouchEnd={stopDrawing}
        onTouchCancel={stopDrawing}
      />

      {latexExpression.map((latex, index) => (
        <Draggable
          key={index}
          defaultPosition={latexPosition}
          onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
        >
          <div className="absolute bg-black/80 p-3 text-white rounded shadow-lg animate-fadeIn max-w-xs text-sm backdrop-blur-sm">
            <div className="latex-content">{latex}</div>
          </div>
        </Draggable>
      ))}
    </>
  );
}
