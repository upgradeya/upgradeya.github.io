const TAU = Math.PI * 2;
const MOBILE_BREAKPOINT = 600;

export function cappedPixelRatio(value = 1) {
  return Math.max(1, Math.min(1.5, Number(value) || 1));
}

export function calculateNodeCount(width, height) {
  const estimated = Math.round((width * height) / 26000) + 20;
  const max = width < MOBILE_BREAKPOINT ? 32 : 78;
  const min = width < MOBILE_BREAKPOINT ? 20 : 34;
  return Math.max(min, Math.min(max, estimated));
}

export function connectionOpacity(distance, maxDistance) {
  if (distance >= maxDistance) return 0;
  const proximity = 1 - distance / maxDistance;
  return proximity * proximity * 0.64;
}

export function connectionProfile(width) {
  return {
    maxPeers: 5,
    maxDistance: width < MOBILE_BREAKPOINT ? 210 : Math.min(280, width * 0.2),
  };
}

export function buildPeerConnections(nodes, maxPeers = 4, maxDistance = Infinity) {
  if (nodes.length < 2 || maxPeers < 1) return [];

  const candidates = [];
  for (let first = 0; first < nodes.length; first += 1) {
    for (let second = first + 1; second < nodes.length; second += 1) {
      const distance = Math.hypot(
        nodes[first].x - nodes[second].x,
        nodes[first].y - nodes[second].y,
      );
      if (distance <= maxDistance) candidates.push({ first, second, distance });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance || a.first - b.first || a.second - b.second);

  const degrees = Array(nodes.length).fill(0);
  const used = new Set();
  const connections = [];

  for (let targetDegree = 1; targetDegree <= maxPeers; targetDegree += 1) {
    for (let node = 0; node < nodes.length; node += 1) {
      if (degrees[node] >= targetDegree) continue;

      const candidate = candidates.find(({ first, second }) => {
        if (first !== node && second !== node) return false;
        const peer = first === node ? second : first;
        const key = `${Math.min(node, peer)}-${Math.max(node, peer)}`;
        return !used.has(key) && degrees[node] < maxPeers && degrees[peer] < maxPeers;
      });

      if (!candidate) continue;
      const peer = candidate.first === node ? candidate.second : candidate.first;
      const key = `${Math.min(node, peer)}-${Math.max(node, peer)}`;
      used.add(key);
      degrees[node] += 1;
      degrees[peer] += 1;
      connections.push([Math.min(node, peer), Math.max(node, peer)]);
    }
  }

  return connections;
}

export function buildSignalRoute(connections, maxHops = 5, random = Math.random) {
  if (!connections.length || maxHops < 1) return [];

  const adjacency = new Map();
  for (const [first, second] of connections) {
    if (!adjacency.has(first)) adjacency.set(first, []);
    if (!adjacency.has(second)) adjacency.set(second, []);
    adjacency.get(first).push(second);
    adjacency.get(second).push(first);
  }

  const seed = connections[Math.floor(random() * connections.length)];
  let current = seed[Math.floor(random() * seed.length)];
  const route = [current];
  const visited = new Set(route);

  while (route.length <= maxHops) {
    const candidates = (adjacency.get(current) || []).filter((node) => !visited.has(node));
    if (!candidates.length) break;
    current = candidates[Math.floor(random() * candidates.length)];
    route.push(current);
    visited.add(current);
  }

  return route;
}

export function electricHopDuration(random = Math.random) {
  return 260 + random() * 120;
}

export function pointAlongConnection(a, b, progress) {
  return {
    x: a.x + (b.x - a.x) * progress,
    y: a.y + (b.y - a.y) * progress,
  };
}

export function broadcastRadius(elapsedMilliseconds, speedPixelsPerSecond) {
  return Math.max(0, elapsedMilliseconds) * (speedPixelsPerSecond / 1000);
}

export function broadcastNodeIntensity(distance, radius, trailDistance = 120) {
  const distanceBehindWave = radius - distance;
  if (distanceBehindWave < 0 || distanceBehindWave >= trailDistance) return 0;
  return 1 - distanceBehindWave / trailDistance;
}

export function pickVisibleNodeIndex(nodes, width, height, random = Math.random) {
  const visible = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.x >= 0 && node.x <= width && node.y >= 0 && node.y <= height);
  const candidates = visible.length ? visible : nodes.map((node, index) => ({ node, index }));
  if (!candidates.length) return -1;
  return candidates[Math.floor(random() * candidates.length)].index;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

class SignalField {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: true });
    this.nodes = [];
    this.connections = [];
    this.connectionDistance = 0;
    this.pulses = [];
    this.broadcasts = [];
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.frame = null;
    this.lastTime = 0;
    this.nextPulseAt = 0;
    this.nextBroadcastAt = 0;
    this.visible = !document.hidden;
    this.pointer = { x: 0, y: 0, active: false };
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.resizeObserver = new ResizeObserver(() => this.resize());

    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);
    this.onMotionPreference = this.onMotionPreference.bind(this);
    this.tick = this.tick.bind(this);
  }

  start() {
    this.resizeObserver.observe(document.documentElement);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
    this.reducedMotion.addEventListener('change', this.onMotionPreference);
    this.resize();
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = cappedPixelRatio(window.devicePixelRatio);

    if (width === this.width && height === this.height && ratio === this.pixelRatio) return;

    this.width = width;
    this.height = height;
    this.pixelRatio = ratio;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.seedNodes(calculateNodeCount(width, height));
    this.restart();
  }

  seedNodes(count) {
    const margin = Math.max(60, Math.min(this.width, this.height) * 0.08);
    const rows = Math.max(2, Math.round(Math.sqrt((count * this.height) / this.width)));
    const columns = Math.ceil(count / rows);
    const cellWidth = (this.width + margin * 2) / columns;
    const cellHeight = (this.height + margin * 2) / rows;
    this.nodes = Array.from({ length: count }, (_, index) => ({
      x: -margin + (index % columns + 0.5 + randomBetween(-0.34, 0.34)) * cellWidth,
      y: -margin + (Math.floor(index / columns) + 0.5 + randomBetween(-0.34, 0.34)) * cellHeight,
      vx: randomBetween(-0.055, 0.055),
      vy: randomBetween(-0.045, 0.045),
      radius: index % 11 === 0 ? randomBetween(1.25, 1.8) : randomBetween(0.45, 1.05),
      phase: randomBetween(0, TAU),
      depth: randomBetween(0.55, 1),
    }));
    const profile = connectionProfile(this.width);
    this.connectionDistance = profile.maxDistance;
    this.connections = buildPeerConnections(this.nodes, profile.maxPeers, profile.maxDistance);
    this.pulses = [];
    this.broadcasts = [];
    this.nextPulseAt = performance.now() + randomBetween(2400, 4200);
    this.nextBroadcastAt = performance.now() + randomBetween(5200, 8800);
  }

  restart() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.lastTime = performance.now();
    this.draw(this.lastTime, 0);

    if (this.visible && !this.reducedMotion.matches) {
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  tick(time) {
    const delta = Math.min(32, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    this.update(time, delta);
    this.draw(time, delta);
    this.frame = requestAnimationFrame(this.tick);
  }

  update(time, delta) {
    const scale = delta / 16.667;
    const margin = 90;

    for (const node of this.nodes) {
      const swayX = Math.sin(time * 0.00013 + node.phase) * 0.012;
      const swayY = Math.cos(time * 0.00011 + node.phase) * 0.01;
      node.x += (node.vx + swayX) * scale * node.depth;
      node.y += (node.vy + swayY) * scale * node.depth;

      if (this.pointer.active) {
        const dx = node.x - this.pointer.x;
        const dy = node.y - this.pointer.y;
        const distance = Math.hypot(dx, dy);
        const radius = 165;
        if (distance > 0 && distance < radius) {
          const force = (1 - distance / radius) * 0.16 * scale;
          node.x += (dx / distance) * force;
          node.y += (dy / distance) * force;
        }
      }

      if (node.x < -margin) node.x = this.width + margin;
      if (node.x > this.width + margin) node.x = -margin;
      if (node.y < -margin) node.y = this.height + margin;
      if (node.y > this.height + margin) node.y = -margin;
    }
  }

  draw(time) {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.lineWidth = 1;
    for (const [first, second] of this.connections) {
      const a = this.nodes[first];
      const b = this.nodes[second];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const opacity = connectionOpacity(distance, this.connectionDistance);
      ctx.strokeStyle = `rgba(100, 142, 255, ${opacity})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    this.drawNodes(ctx, time);
    this.drawBroadcasts(ctx, time);
    this.drawPulses(ctx, time, this.connections);
  }

  drawNodes(ctx, time) {
    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      const shimmer = 0.72 + Math.sin(time * 0.0007 + node.phase) * 0.2;

      if (index % 11 === 0) {
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 16);
        glow.addColorStop(0, `rgba(97, 157, 255, ${0.18 * shimmer})`);
        glow.addColorStop(1, 'rgba(73, 57, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 16, 0, TAU);
        ctx.fill();
      }

      ctx.fillStyle = index % 5 === 0
        ? `rgba(126, 176, 255, ${0.64 * shimmer})`
        : `rgba(112, 91, 255, ${0.5 * shimmer})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, TAU);
      ctx.fill();
    }
  }

  drawPulses(ctx, time, connections) {
    if (!this.reducedMotion.matches && time >= this.nextPulseAt && connections.length) {
      const maxHops = Math.floor(randomBetween(3, 6));
      const route = buildSignalRoute(connections, maxHops);
      if (route.length >= 2) {
        this.pulses.push({
          route,
          start: time,
          hopDuration: electricHopDuration(),
        });
      }
      const quietGap = this.width < MOBILE_BREAKPOINT
        ? randomBetween(8200, 12800)
        : randomBetween(6200, 9800);
      this.nextPulseAt = time + quietGap;
    }

    this.pulses = this.pulses.filter((pulse) => {
      const elapsed = time - pulse.start;
      const hop = Math.floor(elapsed / pulse.hopDuration);
      if (hop >= pulse.route.length - 1) return false;

      const progress = (elapsed % pulse.hopDuration) / pulse.hopDuration;
      const a = this.nodes[pulse.route[hop]];
      const b = this.nodes[pulse.route[hop + 1]];
      if (!a || !b) return false;

      const eased = progress * progress * (3 - 2 * progress);
      const intensity = 0.46 + Math.sin(progress * Math.PI) * 0.42;
      this.drawElectricSegment(ctx, a, b, eased, intensity);
      return true;
    });
  }

  drawBroadcasts(ctx, time) {
    if (this.reducedMotion.matches) {
      this.broadcasts = [];
      return;
    }

    if (time >= this.nextBroadcastAt && this.nodes.length) {
      const sourceIndex = pickVisibleNodeIndex(this.nodes, this.width, this.height);
      const source = this.nodes[sourceIndex];
      const maxRadius = Math.max(
        Math.hypot(source.x, source.y),
        Math.hypot(this.width - source.x, source.y),
        Math.hypot(source.x, this.height - source.y),
        Math.hypot(this.width - source.x, this.height - source.y),
      ) + 130;
      this.broadcasts.push({
        sourceIndex,
        x: source.x,
        y: source.y,
        start: time,
        speed: randomBetween(250, 310),
        maxRadius,
      });
      this.nextBroadcastAt = time + randomBetween(16000, 26000);
    }

    this.broadcasts = this.broadcasts.filter((broadcast) => {
      const elapsed = time - broadcast.start;
      const radius = broadcastRadius(elapsed, broadcast.speed);
      if (radius > broadcast.maxRadius) return false;

      const life = Math.max(0.18, 1 - radius / broadcast.maxRadius);
      ctx.save();
      ctx.beginPath();
      ctx.arc(broadcast.x, broadcast.y, radius, 0, TAU);
      ctx.strokeStyle = `rgba(85, 161, 255, ${0.2 * life})`;
      ctx.lineWidth = 1.15;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(broadcast.x, broadcast.y, Math.max(0, radius - 3), 0, TAU);
      ctx.strokeStyle = `rgba(115, 91, 255, ${0.08 * life})`;
      ctx.lineWidth = 5;
      ctx.stroke();

      const sourceNode = this.nodes[broadcast.sourceIndex];
      if (sourceNode && elapsed < 720) {
        const blinkLife = 1 - elapsed / 720;
        const blink = blinkLife * (0.58 + Math.sin(elapsed * 0.035) ** 2 * 0.42);
        this.drawBroadcastNodeGlow(ctx, sourceNode, blink);
      }

      for (const node of this.nodes) {
        const distance = Math.hypot(node.x - broadcast.x, node.y - broadcast.y);
        const intensity = broadcastNodeIntensity(distance, radius, 120);
        if (intensity > 0) this.drawBroadcastNodeGlow(ctx, node, intensity);
      }
      ctx.restore();
      return true;
    });
  }

  drawBroadcastNodeGlow(ctx, node, intensity) {
    const radius = 15 + intensity * 5;
    const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
    glow.addColorStop(0, `rgba(226, 241, 255, ${0.76 * intensity})`);
    glow.addColorStop(0.22, `rgba(69, 166, 255, ${0.4 * intensity})`);
    glow.addColorStop(1, 'rgba(91, 53, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, TAU);
    ctx.fill();

    ctx.fillStyle = `rgba(223, 239, 255, ${0.74 * intensity})`;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 0.8, 0, TAU);
    ctx.fill();
  }

  drawElectricSegment(ctx, a, b, progress, intensity) {
    const head = pointAlongConnection(a, b, progress);

    const traceSignal = () => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(head.x, head.y);
    };

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    traceSignal();
    ctx.strokeStyle = `rgba(67, 139, 255, ${0.14 * intensity})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    traceSignal();
    ctx.strokeStyle = `rgba(204, 229, 255, ${0.68 * intensity})`;
    ctx.lineWidth = 0.78;
    ctx.stroke();

    const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 8);
    glow.addColorStop(0, `rgba(231, 243, 255, ${0.82 * intensity})`);
    glow.addColorStop(0.3, `rgba(71, 167, 255, ${0.4 * intensity})`);
    glow.addColorStop(1, 'rgba(91, 53, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  onVisibilityChange() {
    this.visible = !document.hidden;
    if (!this.visible && this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
      return;
    }
    this.restart();
  }

  onPointerMove(event) {
    if (event.pointerType === 'touch') return;
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
    this.pointer.active = true;
  }

  onPointerLeave() {
    this.pointer.active = false;
  }

  onMotionPreference() {
    this.restart();
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const canvas = document.querySelector('#signal-field');
  if (canvas) new SignalField(canvas).start();
}
