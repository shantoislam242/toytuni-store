"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type ParticleKind = "wood" | "neem" | "cream" | "spark";

type Particle = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  kind: ParticleKind;
};

type ParticlePattern = {
  kind: ParticleKind;
  dx: number;
  dy: number;
  size: number;
  delay: number;
};

const TRAIL_DURATION_MS = 760;
const BURST_DURATION_MS = 820;
const MIN_DISTANCE = 22;
const MAX_PARTICLES = 26;

const trailPattern = [
  { kind: "wood", dx: -4, dy: 8, size: 7, delay: 0 },
  { kind: "neem", dx: 6, dy: 4, size: 5, delay: 0.03 },
  { kind: "cream", dx: -7, dy: -3, size: 4, delay: 0.01 },
  { kind: "spark", dx: 5, dy: -7, size: 3, delay: 0.04 },
] as const satisfies readonly ParticlePattern[];

const burstPattern = [
  { kind: "spark", dx: -18, dy: -16, size: 4, delay: 0 },
  { kind: "wood", dx: -12, dy: 10, size: 7, delay: 0.02 },
  { kind: "neem", dx: 15, dy: -9, size: 6, delay: 0.04 },
  { kind: "cream", dx: 18, dy: 12, size: 5, delay: 0.01 },
  { kind: "spark", dx: 0, dy: -22, size: 3, delay: 0.05 },
  { kind: "wood", dx: 3, dy: 17, size: 5, delay: 0.03 },
] as const satisfies readonly ParticlePattern[];

const particleClassName: Record<ParticleKind, string> = {
  wood: "rounded-[45%] bg-wood-light shadow-[0_0_8px_rgba(138,90,59,0.18)]",
  neem: "rounded-full bg-neem-soft shadow-[0_0_8px_rgba(94,124,74,0.18)]",
  cream: "rounded-full border border-cream-300 bg-paper",
  spark: "rounded-[2px] bg-mustard shadow-[0_0_10px_rgba(232,184,75,0.35)]",
};

export function CursorSparkleTrail() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextIdRef = useRef(0);
  const patternIndexRef = useRef(0);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);

  useEffect(() => {
    const canAnimate =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canAnimate) return;

    const removeParticleLater = (id: number, duration: number) => {
      const timeout = window.setTimeout(() => {
        setParticles((current) => current.filter((particle) => particle.id !== id));
      }, duration);
      timeoutRefs.current.push(timeout);
    };

    const addParticle = (
      point: { x: number; y: number },
      pattern: ParticlePattern,
      duration = TRAIL_DURATION_MS,
    ) => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;

      setParticles((current) => [
        ...current.slice(-(MAX_PARTICLES - 1)),
        {
          id,
          x: point.x,
          y: point.y,
          dx: pattern.dx,
          dy: pattern.dy,
          size: pattern.size,
          delay: pattern.delay,
          kind: pattern.kind,
        },
      ]);

      removeParticleLater(id, duration);
    };

    const drawTrail = () => {
      frameRef.current = null;

      const point = pendingPointRef.current;
      if (!point) return;

      const lastPoint = lastPointRef.current;
      const distance = lastPoint
        ? Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y)
        : MIN_DISTANCE;

      if (distance < MIN_DISTANCE) return;

      lastPointRef.current = point;
      const pattern = trailPattern[patternIndexRef.current % trailPattern.length];
      patternIndexRef.current += 1;
      addParticle(point, pattern);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;

      pendingPointRef.current = { x: event.clientX, y: event.clientY };

      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(drawTrail);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;

      const point = { x: event.clientX, y: event.clientY };
      burstPattern.forEach((pattern) => addParticle(point, pattern, BURST_DURATION_MS));
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      timeoutRefs.current.forEach((timeout) => window.clearTimeout(timeout));
      timeoutRefs.current = [];
    };
  }, []);

  if (!particles.length) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[999] overflow-hidden"
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={cn(
            "absolute left-0 top-0 motion-safe:animate-cursor-sparkle",
            particleClassName[particle.kind],
          )}
          style={{
            "--sparkle-x": `${particle.dx}px`,
            "--sparkle-y": `${particle.dy}px`,
            animationDelay: `${particle.delay}s`,
            height: `${particle.size}px`,
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
