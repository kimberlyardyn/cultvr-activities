"use client";

import { useEffect, useRef } from "react";

const colors = {
  stemDark: "#2A3144",
  olive: "#3F4A66",
  sage: "#7A86A8",
  sageHi: "#A4AEC8",
  clay: "#C97A5D",
  clayHi: "#E59C7C",
  clayDark: "#8E4F38",
  butter: "#E0B26B",
  butterHi: "#F1C97A",
};

const nodes = [
  { t: 0.28, side: -1, size: 0.78, start: 1.5, dur: 1.2 },
  { t: 0.28, side: 1, size: 0.78, start: 1.72, dur: 1.2 },
  { t: 0.55, side: -1, size: 0.96, start: 2.55, dur: 1.35 },
  { t: 0.55, side: 1, size: 0.96, start: 2.8, dur: 1.35 },
  { t: 0.8, side: -1, size: 0.64, start: 3.65, dur: 1.05 },
  { t: 0.8, side: 1, size: 0.64, start: 3.85, dur: 1.05 },
];

type PlantParticle = {
  color: string;
  gravity: number;
  life: number;
  maxLife: number;
  rot: number;
  rotV: number;
  size: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type PlantSample = {
  color: string;
  size: number;
  x: number;
  y: number;
};

export function LandingPlant() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasElement = canvas;

    const maybeContext = canvasElement.getContext("2d");
    if (!maybeContext) return;
    const ctx: CanvasRenderingContext2D = maybeContext;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let cycleTime = 0;
    let last = performance.now();
    let released = 0;
    let samples: PlantSample[] = [];
    const particles: PlantParticle[] = [];

    const baseY = 0.92;
    const tipY = 0.18;
    const holdEnd = 7.7;
    const disintegrateEnd = 11.3;
    const cycle = 13;

    const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
    const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);
    const easeOutBack = (value: number) => {
      const c1 = 1.45;
      const c3 = c1 + 1;
      const k = value - 1;
      return 1 + c3 * k * k * k + c1 * k * k;
    };

    function stemPoint(t: number) {
      return {
        x: (0.5 + Math.sin(t * Math.PI * 1.4) * 0.022) * width,
        y: (baseY - t * (baseY - tipY)) * height,
      };
    }

    function stemTangent(t: number) {
      const a = stemPoint(Math.max(0, t - 0.01));
      const b = stemPoint(Math.min(1, t + 0.01));
      return Math.atan2(b.y - a.y, b.x - a.x);
    }

    function stemProgress(t: number) {
      if (t <= 0.25) return 0;
      if (t >= 4.6) return 1;
      return easeOutCubic((t - 0.25) / 4.35);
    }

    function leafProgress(node: (typeof nodes)[number], t: number) {
      return clamp01((t - node.start) / node.dur);
    }

    function petalProgress(t: number, index: number, back: boolean) {
      return clamp01((t - (4.4 + index * 0.09 + (back ? -0.08 : 0))) / 1.3);
    }

    function coreProgress(t: number) {
      return clamp01((t - 4.8) / 0.7);
    }

    function resize() {
      const rect = canvasElement.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvasElement.width = Math.max(1, Math.round(width * dpr));
      canvasElement.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildSamples();
    }

    function drawStem(progress: number) {
      if (progress <= 0) return;
      const points = Array.from({ length: 61 }, (_, index) =>
        stemPoint((index / 60) * progress),
      );
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(31,36,51,0.18)";
      ctx.lineWidth = 4.6;
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      const top = points[points.length - 1];
      const bottom = points[0];
      const gradient = ctx.createLinearGradient(bottom.x, bottom.y, top.x, top.y);
      gradient.addColorStop(0, colors.stemDark);
      gradient.addColorStop(0.6, colors.olive);
      gradient.addColorStop(1, colors.sage);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }

    function drawLeaf(node: (typeof nodes)[number], progress: number, t: number, seed: number) {
      if (progress <= 0) return;
      const base = stemPoint(node.t);
      const outAngle = stemTangent(node.t) + node.side * (Math.PI / 2 + 0.3);
      const unfurl = easeOutCubic(clamp01(progress * 1.15));
      const angle =
        outAngle -
        node.side * 1.05 * (1 - unfurl) +
        Math.sin(t * 1.4 + seed * 1.3) * 0.02 * clamp01((progress - 0.7) / 0.3);
      const scale = easeOutBack(clamp01(progress * 1.05));
      const length = node.size * width * 0.18;
      const leafWidth = node.size * width * 0.058;

      ctx.save();
      ctx.translate(base.x, base.y);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(length * 0.18, -leafWidth * 0.95, length * 0.65, -leafWidth * 0.85, length, 0);
      ctx.bezierCurveTo(length * 0.65, leafWidth * 0.85, length * 0.18, leafWidth * 0.95, 0, 0);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, 0, length, 0);
      gradient.addColorStop(0, colors.stemDark);
      gradient.addColorStop(0.5, colors.olive);
      gradient.addColorStop(1, colors.sage);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = "rgba(31,36,51,0.30)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(length * 0.94, 0);
      ctx.stroke();
      ctx.restore();
    }

    function drawFlower(t: number) {
      const tip = stemPoint(1);
      const radius = width * 0.07;
      ctx.save();
      ctx.translate(tip.x, tip.y);

      for (const back of [true, false]) {
        for (let index = 0; index < 5; index += 1) {
          const progress = petalProgress(t, index, back);
          if (progress <= 0) continue;
          ctx.save();
          ctx.rotate((index / 5) * Math.PI * 2 + (back ? Math.PI / 5 : 0));
          ctx.scale(easeOutBack(progress), easeOutBack(progress));
          ctx.beginPath();
          ctx.ellipse(radius * 0.46, 0, radius * 0.41, radius * 0.21, 0, 0, Math.PI * 2);
          const gradient = ctx.createRadialGradient(radius * 0.25, 0, 0, radius * 0.46, 0, radius * 0.48);
          gradient.addColorStop(0, back ? colors.clay : colors.clayHi);
          gradient.addColorStop(0.65, colors.clay);
          gradient.addColorStop(1, colors.clayDark);
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.restore();
        }
      }

      const core = coreProgress(t);
      if (core > 0) {
        ctx.scale(easeOutBack(core), easeOutBack(core));
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = colors.butter;
        ctx.fill();
      }
      ctx.restore();
    }

    function buildSamples() {
      samples = [];
      for (let index = 0; index < 70; index += 1) {
        const t = index / 69;
        const point = stemPoint(t);
        samples.push({
          x: point.x,
          y: point.y,
          color: t < 0.4 ? colors.stemDark : t < 0.8 ? colors.olive : colors.sage,
          size: 1.5,
        });
      }
      for (const node of nodes) {
        const base = stemPoint(node.t);
        const angle = stemTangent(node.t) + node.side * (Math.PI / 2 + 0.3);
        for (let index = 0; index < 45; index += 1) {
          const u = Math.random();
          const dist = u * node.size * width * 0.18;
          const cross = (Math.random() - 0.5) * Math.sin(u * Math.PI) * node.size * width * 0.08;
          samples.push({
            x: base.x + Math.cos(angle) * dist - Math.sin(angle) * cross,
            y: base.y + Math.sin(angle) * dist + Math.cos(angle) * cross,
            color: u < 0.65 ? colors.olive : colors.sageHi,
            size: 1.6,
          });
        }
      }
      const tip = stemPoint(1);
      const radius = width * 0.07;
      for (let index = 0; index < 90; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * radius * 0.8;
        samples.push({
          x: tip.x + Math.cos(angle) * dist,
          y: tip.y + Math.sin(angle) * dist,
          color: Math.random() > 0.25 ? colors.clay : colors.butterHi,
          size: 1.6,
        });
      }
      samples = samples.sort(() => Math.random() - 0.5);
    }

    function makeParticle(sample: PlantSample): PlantParticle {
      const dx = sample.x - width * 0.5;
      const dy = sample.y - height * 0.55;
      const distance = Math.hypot(dx, dy) || 1;
      return {
        ...sample,
        gravity: 8 + Math.random() * 10,
        life: 0,
        maxLife: 3 + Math.random() * 1.8,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 3,
        vx: (dx / distance) * (0.4 + Math.random() * 0.5),
        vy: (dy / distance) * 0.25 - 0.5 - Math.random() * 0.45,
      };
    }

    function drawParticle(particle: PlantParticle, dt: number) {
      particle.life += dt;
      particle.vy += particle.gravity * dt;
      particle.vx += (Math.random() - 0.44) * dt * 4;
      particle.rot += particle.rotV * dt;
      particle.x += particle.vx;
      particle.y += particle.vy;

      const alpha = Math.min(1, particle.life / 0.25) * Math.min(1, (particle.maxLife - particle.life) / 0.9);
      if (alpha <= 0 || particle.y > height + 30) return false;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, particle.size * 1.15, particle.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      return particle.life < particle.maxLife;
    }

    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cycleTime += dt;
      if (cycleTime >= cycle) {
        cycleTime = 0;
        released = 0;
      }

      ctx.clearRect(0, 0, width, height);
      const inDisintegrate = cycleTime >= holdEnd && cycleTime < disintegrateEnd;
      const disintegrateProgress = inDisintegrate
        ? clamp01((cycleTime - holdEnd) / (disintegrateEnd - holdEnd))
        : cycleTime >= disintegrateEnd
          ? 1
          : 0;
      const plantAlpha = 1 - easeOutCubic(disintegrateProgress);

      if (plantAlpha > 0.01 && cycleTime < disintegrateEnd) {
        ctx.save();
        const pivot = stemPoint(0);
        ctx.translate(pivot.x, pivot.y);
        ctx.rotate(Math.sin(cycleTime) * 0.012);
        ctx.translate(-pivot.x, -pivot.y);
        ctx.globalAlpha = plantAlpha;
        drawStem(stemProgress(cycleTime));
        nodes.forEach((node, index) =>
          drawLeaf(node, leafProgress(node, cycleTime), cycleTime, index),
        );
        drawFlower(cycleTime);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      if (inDisintegrate) {
        const target = Math.floor(samples.length * easeOutCubic(disintegrateProgress));
        while (released < target && released < samples.length) {
          particles.push(makeParticle(samples[released]));
          released += 1;
        }
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        if (!drawParticle(particles[index], dt)) particles.splice(index, 1);
      }

      frame = requestAnimationFrame(tick);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvasElement);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />;
}
