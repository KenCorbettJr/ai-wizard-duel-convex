"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { transformConvexImageUrl } from "@/lib/convex-image-proxy";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;

type View = { scale: number; x: number; y: number };
const RESET: View = { scale: 1, x: 0, y: 0 };

interface ImageLightboxProps {
  /** Convex storage id of the full-size image. */
  storageId?: string;
  /** Or a plain URL, for images not in Convex storage. */
  src?: string;
  alt: string;
  /** The thumbnail; tapping it opens the viewer. */
  children: ReactNode;
  className?: string;
}

/**
 * Wraps an image so tapping it opens a full-screen viewer where pinch,
 * drag, double-tap and the mouse wheel zoom the image alone, not the page.
 */
export function ImageLightbox({
  storageId,
  src,
  alt,
  children,
  className,
}: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        aria-label={`Enlarge image: ${alt}`}
        className={cn(
          "group relative block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          className,
        )}
      >
        {children}
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white opacity-80 backdrop-blur-sm transition-opacity group-hover:opacity-100"
        >
          <Maximize2 className="size-3.5" />
          <span className="sr-only sm:not-sr-only">Enlarge</span>
        </span>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            {alt}
          </DialogPrimitive.Title>
          {open && (
            <Viewer
              storageId={storageId}
              src={src}
              alt={alt}
              onClose={() => setOpen(false)}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Viewer({
  storageId,
  src,
  alt,
  onClose,
}: {
  storageId?: string;
  src?: string;
  alt: string;
  onClose: () => void;
}) {
  const convexUrl = transformConvexImageUrl(
    useQuery(
      api.wizards.getIllustrationUrl,
      storageId ? { storageId } : "skip",
    ),
  );
  const url = src ?? convexUrl;

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [view, setView] = useState<View>(RESET);
  const [animate, setAnimate] = useState(false);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    startView: View;
    startDist: number;
    startMid: { x: number; y: number };
    startPoint: { x: number; y: number };
    moved: boolean;
  } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  /** Keep the image covering the viewport edges it overflows. */
  const clamp = useCallback((v: View): View => {
    const c = containerRef.current;
    const img = imgRef.current;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
    if (!c || !img) return { ...v, scale };
    const maxX = Math.max(0, (img.offsetWidth * scale - c.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * scale - c.clientHeight) / 2);
    return {
      scale,
      x: Math.min(maxX, Math.max(-maxX, v.x)),
      y: Math.min(maxY, Math.max(-maxY, v.y)),
    };
  }, []);

  /** Point relative to the container centre, which is the transform origin. */
  const toLocal = useCallback((clientX: number, clientY: number) => {
    const r = containerRef.current!.getBoundingClientRect();
    return {
      x: clientX - r.left - r.width / 2,
      y: clientY - r.top - r.height / 2,
    };
  }, []);

  /** Zoom to `scale`, keeping the content under `p` fixed on screen. */
  const zoomAt = useCallback(
    (from: View, scale: number, p: { x: number; y: number }) => {
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      const k = s / from.scale;
      return clamp({
        scale: s,
        x: p.x - (p.x - from.x) * k,
        y: p.y - (p.y - from.y) * k,
      });
    },
    [clamp],
  );

  const startGesture = () => {
    const pts = [...pointers.current.values()];
    const [a, b] = pts;
    gesture.current = {
      startView: view,
      startDist: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
      startMid: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a,
      startPoint: a,
      moved: gesture.current?.moved ?? false,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    pointers.current.set(e.pointerId, toLocal(e.clientX, e.clientY));
    setAnimate(false);
    startGesture();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, toLocal(e.clientX, e.clientY));
    const g = gesture.current;
    const pts = [...pointers.current.values()];

    if (pts.length >= 2) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const scaled = zoomAt(
        g.startView,
        g.startView.scale * (dist / g.startDist),
        g.startMid,
      );
      g.moved = true;
      setView(
        clamp({
          ...scaled,
          x: scaled.x + mid.x - g.startMid.x,
          y: scaled.y + mid.y - g.startMid.y,
        }),
      );
    } else {
      const p = pts[0];
      const dx = p.x - g.startPoint.x;
      const dy = p.y - g.startPoint.y;
      if (Math.hypot(dx, dy) > 6) g.moved = true;
      if (g.startView.scale > 1) {
        setView(
          clamp({
            ...g.startView,
            x: g.startView.x + dx,
            y: g.startView.y + dy,
          }),
        );
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = pointers.current.get(e.pointerId)!;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;

    if (pointers.current.size > 0) {
      // One finger lifted mid-pinch: carry on panning with the other.
      startGesture();
      return;
    }
    if (!g || g.moved) return;

    // A tap. Two in quick succession toggle zoom at that spot.
    const now = Date.now();
    const prev = lastTap.current;
    if (
      prev &&
      now - prev.t < DOUBLE_TAP_MS &&
      Math.hypot(p.x - prev.x, p.y - prev.y) < 30
    ) {
      lastTap.current = null;
      setAnimate(true);
      setView((v) => (v.scale > 1 ? RESET : zoomAt(v, DOUBLE_TAP_SCALE, p)));
    } else {
      lastTap.current = { t: now, ...p };
    }
  };

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setAnimate(false);
      const p = toLocal(e.clientX, e.clientY);
      setView((v) => zoomAt(v, v.scale * Math.exp(-e.deltaY * 0.002), p));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [toLocal, zoomAt]);

  // Re-fit if the screen rotates or resizes.
  useEffect(() => {
    const onResize = () => setView((v) => clamp(v));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const step = (factor: number) => {
    setAnimate(true);
    setView((v) => zoomAt(v, v.scale * factor, { x: 0, y: 0 }));
  };

  const zoomed = view.scale > 1.01;

  return (
    <div className="relative h-full w-full select-none">
      <div
        ref={containerRef}
        className={cn(
          "flex h-full w-full touch-none items-center justify-center overflow-hidden",
          zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {url ? (
          // Full-resolution original so zooming in shows real detail.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={url}
            alt={alt}
            draggable={false}
            className={cn(
              "max-h-full max-w-full object-contain will-change-transform",
              animate && "transition-transform duration-200 ease-out",
            )}
            style={{
              transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
            }}
          />
        ) : (
          <div className="size-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-end gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => step(1 / 1.6)}
          disabled={!zoomed}
          aria-label="Zoom out"
          className="pointer-events-auto hidden rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-40 sm:block"
        >
          <ZoomOut className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => step(1.6)}
          disabled={view.scale >= MAX_SCALE}
          aria-label="Zoom in"
          className="pointer-events-auto hidden rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-40 sm:block"
        >
          <ZoomIn className="size-5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="pointer-events-auto rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>

      {!zoomed && (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-white/60">
          <span className="sm:hidden">Pinch or double-tap to zoom</span>
          <span className="hidden sm:inline">
            Scroll or double-click to zoom · Esc to close
          </span>
        </p>
      )}
    </div>
  );
}
