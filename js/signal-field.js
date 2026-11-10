(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.getElementById("field");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d", { alpha: true });
  var nodes = [];
  var signals = [];
  var raf = 0;
  var last = 0;
  var w = 0;
  var h = 0;
  var dpr = 1;
  var running = true;
  var nextSignal = 800;

  function capDpr() {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  function nodeCount() {
    var area = (window.innerWidth * window.innerHeight) / 1000;
    return Math.max(18, Math.min(48, Math.round(area * 0.045)));
  }

  function resize() {
    dpr = capDpr();
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    var n = nodeCount();
    nodes = [];
    var i;
    for (i = 0; i < n; i++) {
      nodes.push({
        x: Math.random() * w * 1.2 - w * 0.1,
        y: Math.random() * h * 1.2 - h * 0.1,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() < 0.18 ? 2.2 : 1.15,
        halo: Math.random() < 0.22,
        phase: Math.random() * Math.PI * 2
      });
    }
    signals = [];
  }

  function dist(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function maybeSignal(now) {
    var max = w < 720 ? 1 : 3;
    if (signals.length >= max || now < nextSignal) return;
    var a = nodes[(Math.random() * nodes.length) | 0];
    var b = nodes[(Math.random() * nodes.length) | 0];
    if (a === b || dist(a, b) > 220) {
      nextSignal = now + 400;
      return;
    }
    signals.push({ a: a, b: b, t: 0, dur: 1800 + Math.random() * 1800 });
    nextSignal = now + 1400 + Math.random() * 2800;
  }

  function tick(ts) {
    if (!running) return;
    if (!last) last = ts;
    var dt = Math.min(48, ts - last);
    last = ts;
    maybeSignal(ts);
    ctx.clearRect(0, 0, w, h);

    var i, j, a, b, d, maxD, alpha, k, s, p, x, y;
    maxD = Math.min(170, Math.max(110, Math.sqrt(w * h) * 0.09));

    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      a.x += a.vx * dt * 0.06;
      a.y += a.vy * dt * 0.06;
      a.phase += dt * 0.0012;
      if (a.x < -40 || a.x > w + 40) a.vx *= -1;
      if (a.y < -40 || a.y > h + 40) a.vy *= -1;
    }

    ctx.lineWidth = 0.7;
    for (i = 0; i < nodes.length; i++) {
      for (j = i + 1; j < nodes.length; j++) {
        a = nodes[i];
        b = nodes[j];
        d = dist(a, b);
        if (d > maxD) continue;
        alpha = (1 - d / maxD) * 0.22;
        ctx.strokeStyle = "rgba(120, 170, 255," + alpha + ")";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      if (a.halo) {
        k = 0.35 + 0.12 * Math.sin(a.phase);
        ctx.beginPath();
        ctx.fillStyle = "rgba(91, 53, 255," + k * 0.18 + ")";
        ctx.arc(a.x, a.y, a.r * 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.fillStyle = "rgba(217, 231, 255, 0.72)";
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (i = signals.length - 1; i >= 0; i--) {
      s = signals[i];
      s.t += dt;
      p = s.t / s.dur;
      if (p >= 1) {
        signals.splice(i, 1);
        continue;
      }
      p = p * p * (3 - 2 * p);
      x = s.a.x + (s.b.x - s.a.x) * p;
      y = s.a.y + (s.b.y - s.a.y) * p;
      ctx.beginPath();
      ctx.fillStyle = "rgba(22, 140, 255," + (0.85 * (1 - Math.abs(p - 0.5) * 1.4)) + ")";
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    raf = requestAnimationFrame(tick);
  }

  document.addEventListener("visibilitychange", function () {
    running = document.visibilityState === "visible";
    if (running) {
      last = 0;
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
    }
  });

  window.addEventListener("resize", function () {
    clearTimeout(window.__uyiResize);
    window.__uyiResize = setTimeout(resize, 120);
  });

  resize();
  raf = requestAnimationFrame(tick);
})();
