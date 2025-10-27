import React, { useRef, useEffect, useState } from "react";
import { createNoise3D } from "simplex-noise";

interface MagicVortexProps {
  baseHue?: number;
  baseSpeed?: number;
  rangeSpeed?: number;
  baseRadius?: number;
  rangeRadius?: number;
  backgroundColor?: string;
  className?: string;
  children: React.ReactNode;
}

function MagicVortex({
  baseHue = 200,
  baseSpeed = 0.2,
  rangeSpeed = 1.5,
  baseRadius = 1,
  rangeRadius = 2,
  backgroundColor = "#000000",
  className = "",
  children,
}: MagicVortexProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(100);

  useEffect(() => {
    const particleCount =
      window?.innerWidth && window?.innerHeight
        ? Math.round((window.innerWidth * window.innerHeight) / 1000)
        : 700;
    const particlePropCount = 9;
    const particlePropsLength = particleCount * particlePropCount;
    const baseTTL = 50;
    const rangeTTL = 150;
    const rangeHue = 100;
    const noiseSteps = 3;
    const xOff = 0.00125;
    const yOff = 0.00125;
    const zOff = 0.0005;

    let tick = 0;
    const noise3D = createNoise3D();
    let particleProps = new Float32Array(particlePropsLength);
    const center = [0, 0];

    const TAU = 2 * Math.PI;

    const rand = (n: number): number => n * Math.random();
    const randRange = (n: number): number => n - rand(2 * n);
    const fadeInOut = (t: number, m: number): number => {
      const hm = 0.5 * m;
      return Math.abs(((t + hm) % m) - hm) / hm;
    };
    const lerp = (n1: number, n2: number, speed: number): number =>
      (1 - speed) * n1 + speed * n2;

    const getRangeY = () => {
      return containerHeight * 0.4;
    };

    const initParticle = (i: number): void => {
      if (!canvasRef.current) {
        return;
      }

      const x = rand(canvasRef.current.width);
      const y = center[1] + randRange(getRangeY());
      const vx = 0;
      const vy = 0;
      const life = 0;
      const ttl = baseTTL + rand(rangeTTL);
      const speed = baseSpeed + rand(rangeSpeed);
      const radius = baseRadius + rand(rangeRadius);
      const hue = baseHue + rand(rangeHue);

      particleProps.set([x, y, vx, vy, life, ttl, speed, radius, hue], i);
    };

    const initParticles = () => {
      tick = 0;
      particleProps = new Float32Array(particlePropsLength);

      for (let i = 0; i < particlePropsLength; i += particlePropCount) {
        initParticle(i);
      }
    };

    const drawParticle = (
      x: number,
      y: number,
      x2: number,
      y2: number,
      life: number,
      ttl: number,
      radius: number,
      hue: number,
      ctx: CanvasRenderingContext2D
    ): void => {
      const alpha = fadeInOut(life, ttl);
      // Make particles brighter and more visible
      const strokeStyle = `hsla(${hue},100%,70%,${alpha})`;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(radius, 2); // Ensure minimum visibility
      ctx.strokeStyle = strokeStyle;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    };

    const checkBounds = (
      x: number,
      y: number,
      canvas: HTMLCanvasElement
    ): boolean => {
      return x > canvas.width || x < 0 || y > canvas.height || y < 0;
    };

    const updateParticle = (i: number, ctx: CanvasRenderingContext2D): void => {
      if (!canvasRef.current) return;

      const i2 = 1 + i,
        i3 = 2 + i,
        i4 = 3 + i,
        i5 = 4 + i,
        i6 = 5 + i,
        i7 = 6 + i,
        i8 = 7 + i,
        i9 = 8 + i;

      const x = particleProps[i];
      const y = particleProps[i2];
      const n = noise3D(x * xOff, y * yOff, tick * zOff) * noiseSteps * TAU;
      const vx = lerp(particleProps[i3], Math.cos(n), 0.5);
      const vy = lerp(particleProps[i4], Math.sin(n), 0.5);
      let life = particleProps[i5];
      const ttl = particleProps[i6];
      const speed = particleProps[i7];
      const x2 = x + vx * speed;
      const y2 = y + vy * speed;
      const radius = particleProps[i8];
      const hue = particleProps[i9];

      drawParticle(x, y, x2, y2, life, ttl, radius, hue, ctx);

      life++;

      particleProps[i] = x2;
      particleProps[i2] = y2;
      particleProps[i3] = vx;
      particleProps[i4] = vy;
      particleProps[i5] = life;
      if (checkBounds(x, y, canvasRef.current) || life > ttl) {
        initParticle(i);
      }
    };

    const drawParticles = (ctx: CanvasRenderingContext2D): void => {
      for (let i = 0; i < particlePropsLength; i += particlePropCount) {
        updateParticle(i, ctx);
      }
    };

    const renderGlow = (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D
    ) => {
      ctx.save();
      ctx.filter = "blur(3px) brightness(200%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.filter = "blur(6px) brightness(200%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    };

    const renderToScreen = (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D
    ) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    };

    const resize = (canvas: HTMLCanvasElement): void => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      center[0] = 0.5 * canvas.width;
      center[1] = 0.5 * canvas.height;
    };

    const draw = (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D
    ): void => {
      tick++;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawParticles(ctx);
      renderGlow(canvas, ctx);
      renderToScreen(canvas, ctx);

      window.requestAnimationFrame(() => draw(canvas, ctx));
    };

    const setup = (): void => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");

        if (ctx) {
          resize(canvas);
          initParticles();
          draw(canvas, ctx);
        }
      }
    };

    const handleResize = (): void => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        resize(canvas);
      }
    };

    if (containerRef.current) {
      const newHeight = containerRef.current.clientHeight;
      setContainerHeight(newHeight);
    }

    setup();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [
    backgroundColor,
    baseHue,
    baseRadius,
    baseSpeed,
    containerHeight,
    rangeRadius,
    rangeSpeed,
  ]);

  return (
    <div className={`relative w-full h-screen ${className}`}>
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 bg-transparent flex items-center justify-center"
      >
        <canvas ref={canvasRef} />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default MagicVortex;
