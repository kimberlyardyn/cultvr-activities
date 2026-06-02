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

type Branch = {
  depth: number;
  dur: number;
  start: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

type TreeNode = {
  dur: number;
  kind: "leaf" | "root";
  r: number;
  start: number;
  x: number;
  y: number;
};

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

const branchColors = [colors.stemDark, colors.olive, colors.sage, colors.sageHi];
const branchWidths = [5, 3.2, 2.1, 1.4];

function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build a deterministic mind-map tree in normalized [0,1] space: a single
// trunk (one idea) that forks into branches, which fan out into sub-topic
// nodes. Structure is size-independent; pixels are derived at draw time.
function buildTree() {
  const branches: Branch[] = [];
  const treeNodes: TreeNode[] = [];
  const rng = makeRng(7);
  const maxDepth = 3;

  const forkX = 0.5;
  const forkY = 0.6;

  // Trunk: the single starting idea.
  branches.push({ x1: 0.5, y1: 0.9, x2: forkX, y2: forkY, depth: 0, start: 0.3, dur: 1.3 });
  treeNodes.push({ x: forkX, y: forkY, r: 0.035, start: 1.55, dur: 0.6, kind: "root" });

  function grow(
    x: number,
    y: number,
    angle: number,
    length: number,
    parentDepth: number,
    startT: number,
  ) {
    const childDepth = parentDepth + 1;
    const childCount = parentDepth === 0 ? 3 : 2;
    const spread = parentDepth === 0 ? 1.5 : 0.95;

    for (let index = 0; index < childCount; index += 1) {
      const frac = childCount === 1 ? 0.5 : index / (childCount - 1);
      const childAngle = angle - spread / 2 + frac * spread + (rng() - 0.5) * 0.18;
      const len = length * (0.68 + rng() * 0.08);
      const ex = x + Math.cos(childAngle) * len;
      const ey = y + Math.sin(childAngle) * len;
      const dur = 1.15 - childDepth * 0.11;

      branches.push({ x1: x, y1: y, x2: ex, y2: ey, depth: childDepth, start: startT, dur });

      if (childDepth >= maxDepth) {
        treeNodes.push({ x: ex, y: ey, r: 0.02, start: startT + dur * 0.8, dur: 0.5, kind: "leaf" });
      } else {
        grow(ex, ey, childAngle, len, childDepth, startT + dur * 0.66);
      }
    }
  }

  grow(forkX, forkY, -Math.PI / 2, 0.24, 0, 1.6);

  return { branches, treeNodes };
}

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

    const { branches, treeNodes } = buildTree();

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

    const scale = () => width / 300;

    function branchProgress(branch: Branch, t: number) {
      return clamp01((t - branch.start) / branch.dur);
    }

    function nodeProgress(node: TreeNode, t: number) {
      return clamp01((t - node.start) / node.dur);
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

    function drawBranch(branch: Branch, progress: number) {
      if (progress <= 0) return;
      const eased = easeOutCubic(progress);
      const x1 = branch.x1 * width;
      const y1 = branch.y1 * height;
      const x2 = branch.x2 * width;
      const y2 = branch.y2 * height;
      const cx = x1 + (x2 - x1) * eased;
      const cy = y1 + (y2 - y1) * eased;
      const lineWidth = Math.max(0.8, branchWidths[branch.depth] * scale());

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (branch.depth <= 1) {
        ctx.strokeStyle = "rgba(31,36,51,0.16)";
        ctx.lineWidth = lineWidth + 1.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }

      ctx.strokeStyle = branchColors[branch.depth] ?? colors.sageHi;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }

    function drawNode(node: TreeNode, progress: number) {
      if (progress <= 0) return;
      const s = easeOutBack(progress);
      const cx = node.x * width;
      const cy = node.y * height;
      const r = node.r * width * s;
      if (r <= 0) return;

      if (node.kind === "leaf") {
        ctx.strokeStyle = "rgba(201,122,93,0.32)";
        ctx.lineWidth = Math.max(0.6, scale());
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2);
        ctx.stroke();

        const gradient = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
        gradient.addColorStop(0, colors.clayHi);
        gradient.addColorStop(1, colors.clay);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      const gradient = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      gradient.addColorStop(0, colors.butterHi);
      gradient.addColorStop(0.6, colors.butter);
      gradient.addColorStop(1, colors.clay);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(142,79,56,0.5)";
      ctx.lineWidth = Math.max(0.8, 1.2 * scale());
      ctx.stroke();
    }

    function buildSamples() {
      samples = [];
      for (const branch of branches) {
        const x1 = branch.x1 * width;
        const y1 = branch.y1 * height;
        const x2 = branch.x2 * width;
        const y2 = branch.y2 * height;
        const segLength = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(4, Math.round(segLength / 6));
        const color = branchColors[branch.depth] ?? colors.sageHi;
        for (let index = 0; index <= steps; index += 1) {
          const t = index / steps;
          samples.push({
            x: x1 + (x2 - x1) * t,
            y: y1 + (y2 - y1) * t,
            color,
            size: 1.5,
          });
        }
      }
      for (const node of treeNodes) {
        const cx = node.x * width;
        const cy = node.y * height;
        const radius = node.r * width * (node.kind === "root" ? 1.1 : 1.4);
        const count = node.kind === "root" ? 60 : 24;
        for (let index = 0; index < count; index += 1) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.sqrt(Math.random()) * radius;
          samples.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            color:
              node.kind === "root"
                ? Math.random() > 0.5
                  ? colors.butter
                  : colors.clay
                : Math.random() > 0.25
                  ? colors.clay
                  : colors.clayHi,
            size: 1.6,
          });
        }
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
        const pivotX = 0.5 * width;
        const pivotY = 0.9 * height;
        ctx.translate(pivotX, pivotY);
        ctx.rotate(Math.sin(cycleTime) * 0.012);
        ctx.translate(-pivotX, -pivotY);
        ctx.globalAlpha = plantAlpha;
        for (const branch of branches) {
          drawBranch(branch, branchProgress(branch, cycleTime));
        }
        for (const node of treeNodes) {
          drawNode(node, nodeProgress(node, cycleTime));
        }
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
