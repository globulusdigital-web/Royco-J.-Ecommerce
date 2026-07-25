import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useStore } from "../context/StoreContext";
import { defaultThemeSettings, resolveSeasonalTheme } from "../lib/seasonal-themes";

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || minimum));
}

function createParticle(width, height, colors, initial = false) {
  const size = 5 + Math.random() * 10;
  return {
    x: Math.random() * width,
    y: initial ? Math.random() * height : -size * 3,
    size,
    speed: 19 + Math.random() * 34,
    drift: 10 + Math.random() * 20,
    phase: Math.random() * Math.PI * 2,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 1.5,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

function drawParticle(context, particle, kind, time) {
  const { x, y, size, color, rotation } = particle;
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.fillStyle = color;
  context.strokeStyle = color;
  context.globalAlpha = kind === "snow" ? 0.74 : 0.68;

  if (kind === "snow") {
    context.lineWidth = 1;
    for (let spoke = 0; spoke < 3; spoke += 1) {
      context.rotate(Math.PI / 3);
      context.beginPath();
      context.moveTo(-size * 0.65, 0);
      context.lineTo(size * 0.65, 0);
      context.stroke();
    }
  } else if (kind === "coin" || kind === "gold") {
    const gradient = context.createRadialGradient(-size * 0.25, -size * 0.3, 1, 0, 0, size);
    gradient.addColorStop(0, "#fff4a6");
    gradient.addColorStop(0.48, color);
    gradient.addColorStop(1, "#9d6812");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, size * 0.6, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,.65)";
    context.stroke();
  } else if (kind === "spark" || kind === "firework") {
    const pulse = 0.65 + Math.sin(time * 4 + particle.phase) * 0.25;
    context.globalAlpha = pulse;
    context.lineWidth = 1.2;
    for (let ray = 0; ray < (kind === "firework" ? 8 : 4); ray += 1) {
      context.rotate(Math.PI / (kind === "firework" ? 4 : 2));
      context.beginPath();
      context.moveTo(size * 0.18, 0);
      context.lineTo(size, 0);
      context.stroke();
    }
  } else if (kind === "flower" || kind === "hibiscus" || kind === "marigold") {
    const petals = kind === "marigold" ? 8 : 5;
    for (let index = 0; index < petals; index += 1) {
      context.rotate((Math.PI * 2) / petals);
      context.beginPath();
      context.ellipse(0, -size * 0.45, size * 0.26, size * 0.52, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = kind === "hibiscus" ? "#f5ad43" : "#c28c27";
    context.beginPath();
    context.arc(0, 0, size * 0.2, 0, Math.PI * 2);
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(0, size * 0.72);
    context.bezierCurveTo(-size * 0.75, size * 0.22, -size * 0.62, -size * 0.72, 0, -size);
    context.bezierCurveTo(size * 0.62, -size * 0.72, size * 0.75, size * 0.22, 0, size * 0.72);
    context.fill();
    context.strokeStyle = "rgba(114,47,74,.18)";
    context.stroke();
  }
  context.restore();
}

export default function SeasonalPetals() {
  const canvasRef = useRef(null);
  const { storeSettings } = useStore();
  const { language } = useLanguage();
  const [clock, setClock] = useState(() => Date.now());
  const settings = storeSettings?.theme || defaultThemeSettings;
  const resolved = useMemo(
    () => resolveSeasonalTheme(settings, language, new Date(clock)),
    [settings, language, clock],
  );
  const animationsEnabled = settings.animationsEnabled !== false;
  const colorKey = resolved.colors.join("|");

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) setClock(Date.now());
    };
    const interval = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileDisabled = settings.disableOnMobile !== false && window.matchMedia("(max-width: 720px)").matches;
    if (!canvas || !animationsEnabled || reducedMotion || mobileDisabled) return undefined;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return undefined;

    let width = 0;
    let height = 0;
    let particles = [];
    let frame = 0;
    let running = false;
    let lastFrame = 0;
    const density = Math.round(clamp(settings.density, 8, 90));
    const animationSpeed = clamp(settings.speed, 0.25, 2.5);
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = Array.from({ length: density }, () => createParticle(width, height, resolved.colors, true));
    };

    const render = (frameTime) => {
      if (!running) return;
      const delta = Math.min((frameTime - (lastFrame || frameTime)) / 1000, 0.05);
      const elapsed = frameTime / 1000;
      lastFrame = frameTime;
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        particle.y += particle.speed * animationSpeed * delta;
        particle.x += Math.sin(elapsed * 0.7 + particle.phase) * particle.drift * delta;
        particle.rotation += particle.spin * animationSpeed * delta;
        if (particle.y > height + particle.size * 2) {
          Object.assign(particle, createParticle(width, height, resolved.colors));
        }
        if (particle.x < -particle.size) particle.x = width + particle.size;
        if (particle.x > width + particle.size) particle.x = -particle.size;
        drawParticle(context, particle, resolved.particle, elapsed);
      });
      frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      lastFrame = 0;
      frame = requestAnimationFrame(render);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };
    const handleVisibility = () => document.hidden ? stop() : start();

    resize();
    start();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      context.clearRect(0, 0, width, height);
    };
  }, [animationsEnabled, colorKey, resolved.particle, settings.density, settings.speed, settings.disableOnMobile]);

  useEffect(() => {
    document.documentElement.dataset.seasonalTheme = resolved.id;
    return () => delete document.documentElement.dataset.seasonalTheme;
  }, [resolved.id]);

  const showOffer = resolved.id !== "default" && resolved.offer;
  return (
    <>
      <div className={`seasonal-theme-backdrop seasonal-${resolved.background}`} style={resolved.offer?.bannerImageUrl ? { backgroundImage: `linear-gradient(rgba(255,255,255,.78), rgba(255,255,255,.9)), url("${resolved.offer.bannerImageUrl}")`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} aria-hidden="true">
        <span>{resolved.motif}</span>
      </div>
      <canvas ref={canvasRef} className="seasonal-petals" aria-hidden="true" />
      {showOffer && (
        <aside className="seasonal-offer-banner" aria-live="polite">
          <span>{resolved.motif}</span>
          <div>
            <strong>{resolved.title}</strong>
            {resolved.promotionText && <small>{resolved.promotionText}</small>}
          </div>
          {resolved.offer.discountCode && <b>{resolved.offer.discountCode}</b>}
        </aside>
      )}
    </>
  );
}
