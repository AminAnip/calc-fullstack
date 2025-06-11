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
        const resizeCanvas = () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          ctx.lineCap = 'round';
          ctx.lineWidth = 3;
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        return () => window.removeEventListener('resize', resizeCanvas);
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

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
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
        } else if ('nativeEvent' in e) {
          // Mouse event
          offsetX = (e as React.MouseEvent).nativeEvent.offsetX;
          offsetY = (e as React.MouseEvent).nativeEvent.offsetY;
        } else {
          offsetX = 0;
          offsetY = 0;
        }
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
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
        let offsetX, offsetY;
        if ('touches' in e && e.touches.length > 0) {
          const rect = canvas.getBoundingClientRect();
          offsetX = e.touches[0].clientX - rect.left;
          offsetY = e.touches[0].clientY - rect.top;
        } else if ('nativeEvent' in e) {
          offsetX = (e as React.MouseEvent).nativeEvent.offsetX;
          offsetY = (e as React.MouseEvent).nativeEvent.offsetY;
        } else {
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
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Mobile-optimized control panel */}
      <div className="fixed top-2 left-2 right-2 z-30 bg-black/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
        {/* Top row: Reset and Run buttons */}
        <div className="flex justify-between items-center mb-3 gap-2">
          <Button
            onClick={() => setReset(true)}
            className="bg-white text-black hover:bg-gray-100 text-sm px-4 py-2 h-9 flex-1 max-w-[80px]"
          >
            Reset
          </Button>
          <Button
            onClick={runRoute}
            className="bg-white text-black hover:bg-gray-100 text-sm px-4 py-2 h-9 flex-1 max-w-[80px]"
          >
            Run
          </Button>
        </div>
        
        {/* Color swatches - responsive grid */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 justify-items-center">
          {SWATCHES.map((swatch) => (
            <ColorSwatch
              key={swatch}
              color={swatch}
              onClick={() => setColor(swatch)}
              style={{
                border: color === swatch ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                width: '24px',
                height: '24px',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Canvas with proper touch handling */}
      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full touch-none select-none"
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

      {/* Math expressions with mobile-friendly sizing */}
      {latexExpression &&
        latexExpression.map((latex, index) => (
          <Draggable
            key={index}
            defaultPosition={latexPosition}
            onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
            bounds="parent"
          >
            <div className="absolute bg-black/90 backdrop-blur-sm p-2 sm:p-3 text-white rounded-lg shadow-lg animate-fadeIn max-w-[90vw] sm:max-w-xs text-xs sm:text-sm cursor-move">
              <div className="latex-content break-all">{latex}</div>
            </div>
          </Draggable>
        ))}
    </div>
  );
}
