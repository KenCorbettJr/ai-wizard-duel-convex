"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { createNoise3D } from "simplex-noise";

interface MagicVortexProps {
  baseHue?: number;
  baseSpeed?: number;
  rangeSpeed?: number;
  baseRadius?: number;
  rangeRadius?: number;
  backgroundColor?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function MagicVortex({
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
  const animationRef = useRef<number | undefined>(undefined);
  const particlePropsRef = useRef<Float32Array | undefined>(undefined);
  const tickRef = useRef(0);
  const centerRef = useRef<[number, number]>([0, 0]);

  // Constants - using useMemo to ensure they're stable
  const constants = useMemo(() => {
    const particleCount =
      typeof window !== "undefined" && window?.innerWidth && window?.innerHeight
        ? Math.round((window.innerWidth * window.innerHeight) / 1000)
        : 700;

    return {
      particleCount,
      particlePropCount: 9,
      particlePropsLength: particleCount * 9,
      baseTTL: 50,
      rangeTTL: 150,
      rangeHue: 100,
      noiseSteps: 3,
      xOff: 0.00125,
      yOff: 0.00125,
      zOff: 0.0005,
      TAU: 2 * Math.PI,
    };
  }, []);

  const noise3D = useMemo(() => createNoise3D(Math.random), []);

  // Utility functions
  const rand = useCallback((n: number): number => n * Math.random(), []);
  const randRange = useCallback((n: number): number => n - rand(2 * n), [rand]);
  const fadeInOut = useCallback((t: number, m: number): number => {
    const hm = 0.5 * m;
    return Math.abs(((t + hm) % m) - hm) / hm;
  }, []);
  const lerp = useCallback(
    (n1: number, n2: number, speed: number): number =>
      (1 - speed) * n1 + speed * n2,
    []
  );

  const getRangeY = useCallback(() => {
    const height = containerRef.current?.clientHeight || 100;
    return height * 0.4;
  }, []);

  const initParticle = useCallback(
    (i: number) => {
      if (!canvasRef.current || !particlePropsRef.current) return;

      const x = rand(canvasRef.current.width);
      const y = centerRef.current[1] + randRange(getRangeY());
      const vx = 0;
      const vy = 0;
      const life = 0;
      const ttl = constants.baseTTL + rand(constants.rangeTTL);
      const speed = baseSpeed + rand(rangeSpeed);
      const radius = baseRadius + rand(rangeRadius);
      const hue = baseHue + rand(constants.rangeHue);

      particlePropsRef.current.set(
        [x, y, vx, vy, life, ttl, speed, radius, hue],
        i
      );
    },
    [
      baseHue,
      baseSpeed,
      rangeSpeed,
      baseRadius,
      rangeRadius,
      getRangeY,
      randRange,
      rand,
      constants,
    ]
  );

  const initParticles = useCallback(() => {
    tickRef.current = 0;
    particlePropsRef.current = new Float32Array(constants.particlePropsLength);

    for (
      let i = 0;
      i < constants.particlePropsLength;
      i += constants.particlePropCount
    ) {
      initParticle(i);
    }
  }, [initParticle, constants]);

  const drawParticle = useCallback(
    (
      x: number,
      y: number,
      x2: number,
      y2: number,
      life: number,
      ttl: number,
      radius: number,
      hue: number,
      ctx: CanvasRenderingContext2D
    ) => {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = radius;
      ctx.strokeStyle = `hsla(${hue},100%,60%,${fadeInOut(life, ttl)})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    },
    [fadeInOut]
  );

  const checkBounds = useCallback(
    (x: number, y: number, canvas: HTMLCanvasElement) => {
      return x > canvas.width || x < 0 || y > canvas.height || y < 0;
    },
    []
  );

  const updateParticle = useCallback(
    (i: number, ctx: CanvasRenderingContext2D) => {
      if (!canvasRef.current || !particlePropsRef.current) return;

      const props = particlePropsRef.current;
      const i2 = 1 + i;
      const i3 = 2 + i;
      const i4 = 3 + i;
      const i5 = 4 + i;
      const i6 = 5 + i;
      const i7 = 6 + i;
      const i8 = 7 + i;
      const i9 = 8 + i;

      const x = props[i];
      const y = props[i2];
      const n =
        noise3D(
          x * constants.xOff,
          y * constants.yOff,
          tickRef.current * constants.zOff
        ) *
        constants.noiseSteps *
        constants.TAU;
      const vx = lerp(props[i3], Math.cos(n), 0.5);
      const vy = lerp(props[i4], Math.sin(n), 0.5);
      let life = props[i5];
      const ttl = props[i6];
      const speed = props[i7];
      const x2 = x + vx * speed;
      const y2 = y + vy * speed;
      const radius = props[i8];
      const hue = props[i9];

      drawParticle(x, y, x2, y2, life, ttl, radius, hue, ctx);

      life++;
      props[i] = x2;
      props[i2] = y2;
      props[i3] = vx;
      props[i4] = vy;
      props[i5] = life;

      if (checkBounds(x, y, canvasRef.current) || life > ttl) {
        initParticle(i);
      }
    },
    [drawParticle, checkBounds, initParticle, lerp, noise3D, constants]
  );

  const drawParticles = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      for (
        let i = 0;
        i < constants.particlePropsLength;
        i += constants.particlePropCount
      ) {
        updateParticle(i, ctx);
      }
    },
    [updateParticle, constants]
  );

  const renderGlow = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.filter = "blur(6px) brightness(200%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.filter = "blur(3px) brightness(200%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
    []
  );

  const renderToScreen = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
    []
  );

  const resize = useCallback((canvas: HTMLCanvasElement) => {
    const { innerWidth, innerHeight } = window;
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    centerRef.current[0] = 0.5 * canvas.width;
    centerRef.current[1] = 0.5 * canvas.height;
  }, []);

  const draw = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      tickRef.current++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawParticles(ctx);
      renderGlow(canvas, ctx);
      renderToScreen(canvas, ctx);

      animationRef.current = window.requestAnimationFrame(() =>
        draw(canvas, ctx)
      );
    },
    [backgroundColor, drawParticles, renderGlow, renderToScreen]
  );

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (canvas && container) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        resize(canvas);
        initParticles();
        draw(canvas, ctx);
      }
    }
  }, [resize, initParticles, draw]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        resize(canvas);
      }
    }
  }, [resize]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setup();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (animationRef.current) {
          window.cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [setup, handleResize]);

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 bg-transparent flex items-center justify-center"
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
