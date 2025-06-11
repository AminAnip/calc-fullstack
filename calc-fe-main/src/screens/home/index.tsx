import { ColorSwatch } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('rgb(255, 255, 255)');
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult>();
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        // Make canvas responsive
        const resizeCanvas = () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          ctx.lineCap = 'round';
          ctx.lineWidth = window.innerWidth < 768 ? 4 : 3; // Thicker lines on mobile
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        return () => {
          window.removeEventListener('resize', resizeCanvas);
        };
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
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const renderLatexToCanvas = (expression: string, answer: string) => {
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

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const getEventPosition = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    if ('touches' in e && e.touches.length > 0) {
      // Touch event
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('nativeEvent' in e) {
      // Mouse event
      return {
        x: (e as React.MouseEvent).nativeEvent.offsetX,
        y: (e as React.MouseEvent).nativeEvent.offsetY
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.background = 'black';
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const { x, y } = getEventPosition(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
      }
    }
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const { x, y } = getEventPosition(e, canvas);
        ctx.strokeStyle = color;
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const runRoute = async () => {
    console.log('API URL:', import.meta.env.VITE_API_URL);
    setIsLoading(true);

    const canvas = canvasRef.current;

    if (canvas) {
      try {
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
        resp.data.forEach((data: Response) => {
          if (data.assign === true) {
            setDictOfVars({
              ...dictOfVars,
              [data.expr]: data.result,
            });
          }
        });
        
        const ctx = canvas.getContext('2d');
        const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width,
          minY = canvas.height,
          maxX = 0,
          maxY = 0;

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
        resp.data.forEach((data: Response) => {
          setTimeout(() => {
            setResult({
              expression: data.expr,
              answer: data.result,
            });
          }, 1000);
        });
      } catch (error) {
        console.error('Error processing calculation:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      {/* Ultra-compact mobile toolbar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-black/90 backdrop-blur-sm border-b border-white/10 safe-area-inset-top">
        {/* Main toolbar - minimal layout */}
        <div className="flex items-center justify-between px-1 py-1">
          <button
            onClick={() => setReset(true)}
            className="bg-white text-black text-xs px-2 py-1 rounded font-medium min-w-0 flex-shrink-0"
            disabled={isLoading}
          >
            Reset
          </button>

          {/* Current color indicator */}
          <div 
            className="w-5 h-5 rounded border border-white cursor-pointer flex-shrink-0 mx-1"
            style={{ backgroundColor: color }}
            onClick={() => setShowColorPicker(!showColorPicker)}
          />

          <button
            onClick={runRoute}
            className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium disabled:opacity-50 min-w-0 flex-shrink-0"
            disabled={isLoading}
          >
            {isLoading ? '...' : 'Run'}
          </button>
        </div>

        {/* Mobile color picker - full width overlay */}
        {showColorPicker && (
          <div className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-sm border-b border-white/10 p-2 z-40">
            <div className="grid grid-cols-10 gap-1 max-w-full">
              {SWATCHES.map((swatch) => (
                <div
                  key={swatch}
                  className="w-6 h-6 rounded cursor-pointer mx-auto"
                  style={{ 
                    backgroundColor: swatch,
                    border: color === swatch ? '2px solid white' : '1px solid rgba(255,255,255,0.2)'
                  }}
                  onClick={() => {
                    setColor(swatch);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full touch-none"
        style={{ 
          touchAction: 'none', // Prevent default touch behaviors
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={(e) => {
          e.preventDefault();
          startDrawing(e);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          draw(e);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          stopDrawing();
        }}
        onTouchCancel={(e) => {
          e.preventDefault();
          stopDrawing();
        }}
      />

      {/* LaTeX results */}
      {latexExpression &&
        latexExpression.map((latex, index) => (
          <Draggable
            key={index}
            defaultPosition={latexPosition}
            onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
          >
            <div className="absolute bg-black/90 backdrop-blur-sm p-3 text-white rounded-lg shadow-xl border border-white/20 animate-fadeIn max-w-[90vw] md:max-w-xs text-sm">
              <div className="latex-content overflow-auto">{latex}</div>
            </div>
          </Draggable>
        ))}
    </>
  );
}
