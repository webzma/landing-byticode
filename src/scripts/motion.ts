/**
 * Page motion — GSAP + canvas.
 *
 * División de trabajo con global.css: la hoja de estilos posee el estado
 * previo al reveal de cada elemento, para que nada aparezca antes de que
 * GSAP tome el control. `.js-motion` (puesto inline en el head) y el
 * failsafe `.motion-failed` garantizan que la página se muestre aunque el
 * bundle no llegue.
 *
 * El comportamiento es el de la referencia (Byticode Striv.dc):
 * cielo estrellado en canvas con parallax y estrellas fugaces, barra de
 * progreso, spotlight en tarjetas, reveals suaves de 26px y marquees.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, CustomEase);

/* Las curvas de movimiento de la página, portadas de las custom properties
   CSS para que un tween de GSAP y una transición CSS aterricen igual. */
CustomEase.create("soft", "M0,0 C0.22,0.61,0.36,1 1,1");
CustomEase.create("glide", "M0,0 C0.12,0.23,0.5,1 1,1");
CustomEase.create("swift", "M0,0 C0.35,0 0,1 1,1");

gsap.defaults({ ease: "soft", duration: 0.7 });

/** La altura del header sticky — los anclajes tienen que quedar por debajo. */
const HEADER_OFFSET = 88;

/* ─────────────────────────────────────────────────────────────────────────
   Scroll reveal — subida de 26px con la curva de la referencia, en lotes
   escalonados de 60ms.
   ───────────────────────────────────────────────────────────────────────── */
interface RevealVariant {
  from: gsap.TweenVars;
  to: gsap.TweenVars;
}

const REVEALS: Record<string, RevealVariant> = {
  "": {
    from: { opacity: 0, y: 26 },
    to: { opacity: 1, y: 0, duration: 0.7 },
  },
  soft: {
    from: { opacity: 0, y: 16 },
    to: { opacity: 1, y: 0, duration: 0.6 },
  },
  zoom: {
    from: { opacity: 1, scale: 1.03 },
    to: { opacity: 1, scale: 1, duration: 1.2, ease: "glide" },
  },
  fade: {
    from: { opacity: 0 },
    to: { opacity: 1, duration: 0.7 },
  },
};

function reveals() {
  const all = gsap.utils.toArray<HTMLElement>("[data-reveal]");

  /* Un lote por variante — mezclar una subida y un zoom en el mismo stagger
     les daría los mismos vars a todos. */
  for (const [variant, spec] of Object.entries(REVEALS)) {
    const els = all.filter((el) => (el.dataset.reveal ?? "") === variant);
    if (!els.length) continue;

    gsap.set(els, { ...spec.from, willChange: "transform, opacity" });

    ScrollTrigger.batch(els, {
      start: "top 90%",
      once: true,
      interval: 0.12,
      batchMax: 6,
      onEnter: (batch) =>
        gsap.to(batch, {
          ...spec.to,
          stagger: 0.06,
          overwrite: true,
          onComplete() {
            /* Devolver el elemento al estado final de la hoja de estilos y
               limpiar los inline props que GSAP escribió. */
            (this.targets() as HTMLElement[]).forEach((el) =>
              el.classList.add("is-visible")
            );
            gsap.set(this.targets(), { clearProps: "all" });
          },
        }),
    });
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Cielo estrellado — canvas del hero, portado de la referencia: estrellas
   con parallax al puntero, atenuadas en la banda del titular, y estrellas
   fugaces ocasionales. Con reduced-motion pinta un único frame estático.
   ───────────────────────────────────────────────────────────────────────── */
function sky() {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-sky]");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  let W = 0,
    H = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  interface Star {
    x: number; y: number; z: number; r: number;
    base: number; amp: number; tw: number; ph: number;
    dim: number; bright: boolean; c: string;
  }
  interface Shoot {
    x: number; y: number; vx: number; vy: number;
    len: number; life: number; max: number;
  }
  let stars: Star[] = [];
  let shoots: Shoot[] = [];
  const COLORS = ["#ffffff", "#dfe7ff", "#cdd6ff", "#bcd2ff", "#e8e0ff", "#fff4e0"];

  const build = () => {
    const r = canvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const area = W * H;
    const count = Math.max(70, Math.min(240, Math.round(area / 4800)));
    stars = [];
    for (let i = 0; i < count; i++) {
      const depth = Math.random(); // 0 lejos → 1 cerca
      const x = Math.random() * W;
      const y = Math.random() * H * 0.98;
      // atenuar las estrellas de la banda central para que el texto respire
      const nx = (x - W * 0.5) / (W * 0.42);
      const ny = (y - H * 0.46) / (H * 0.26);
      const d = Math.sqrt(nx * nx + ny * ny);
      const dim = 0.12 + 0.88 * Math.min(1, Math.max(0, (d - 0.55) / 0.7));
      const bright = Math.random() < 0.08 && dim > 0.75; // glow solo lejos del título
      stars.push({
        x,
        y,
        z: 0.35 + depth * 0.65,
        r: (bright ? 1.4 + Math.random() * 1.4 : 0.55 + Math.random() * 1.1) * (0.75 + depth * 0.55),
        base: 0.18 + Math.random() * 0.26,
        amp: 0.18 + Math.random() * 0.34,
        tw: 0.4 + Math.random() * 1.7,
        ph: Math.random() * Math.PI * 2,
        dim,
        bright,
        c: COLORS[(Math.random() * COLORS.length) | 0],
      });
    }
  };

  let mx = 0,
    my = 0,
    tmx = 0,
    tmy = 0;
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    tmx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    tmy = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  if (!reduce && finePointer)
    window.addEventListener("pointermove", onMove, { passive: true });

  const spawnShoot = () => {
    const fromLeft = Math.random() < 0.5;
    const y0 = Math.random() * H * 0.4 + 20;
    const ang = (fromLeft ? 1 : -1) * (0.18 + Math.random() * 0.16) * Math.PI;
    const speed = 9 + Math.random() * 6;
    shoots.push({
      x: fromLeft ? -40 : W + 40,
      y: y0,
      vx: Math.cos(ang) * speed * (fromLeft ? 1 : -1),
      vy: Math.sin(ang) * speed,
      len: 90 + Math.random() * 120,
      life: 0,
      max: 60 + Math.random() * 30,
    });
  };
  let nextShoot = 90 + Math.random() * 220;

  let t = 0,
    raf = 0,
    frame = 0;
  const draw = () => {
    t += 0.016;
    frame++;
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    ctx.clearRect(0, 0, W, H);

    for (const s of stars) {
      const tw = reduce ? s.base : s.base + Math.sin(t * s.tw + s.ph) * s.amp;
      const a = Math.max(0.03, Math.min(1, tw)) * s.dim;
      const px = s.x + mx * 14 * s.z;
      const py = s.y + my * 9 * s.z;
      if (s.bright) {
        const g = ctx.createRadialGradient(px, py, 0, px, py, s.r * 6);
        g.addColorStop(0, s.c);
        g.addColorStop(0.25, "rgba(180,200,255," + a * 0.5 + ")");
        g.addColorStop(1, "rgba(180,200,255,0)");
        ctx.globalAlpha = a;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, s.r * 6, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = Math.min(1, a + 0.15);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(px, py, s.r * 0.9, 0, 6.2832);
        ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // estrellas fugaces
    if (!reduce) {
      if (frame >= nextShoot) {
        spawnShoot();
        nextShoot = frame + 160 + Math.random() * 420;
      }
      for (let i = shoots.length - 1; i >= 0; i--) {
        const sh = shoots[i];
        sh.x += sh.vx;
        sh.y += sh.vy;
        sh.life++;
        const fade = sh.life < 10 ? sh.life / 10 : Math.max(0, 1 - (sh.life - 10) / (sh.max - 10));
        const tx = sh.x - (sh.vx / Math.hypot(sh.vx, sh.vy)) * sh.len;
        const ty = sh.y - (sh.vy / Math.hypot(sh.vx, sh.vy)) * sh.len;
        const grad = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
        grad.addColorStop(0, "rgba(255,255,255," + 0.9 * fade + ")");
        grad.addColorStop(0.4, "rgba(150,180,255," + 0.4 * fade + ")");
        grad.addColorStop(1, "rgba(150,180,255,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.globalAlpha = fade;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 1.8, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (sh.life > sh.max || sh.x < -80 || sh.x > W + 80 || sh.y > H + 80) shoots.splice(i, 1);
      }
    }
    raf = requestAnimationFrame(draw);
  };

  build();
  window.addEventListener("resize", build, { passive: true });
  if (reduce) {
    draw();
    cancelAnimationFrame(raf);
  } else {
    raf = requestAnimationFrame(draw);
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Marquees — roster de clientes, filas del stack y testimonios. GSAP los
   conduce para que respondan al scroll: aceleran con la página, van marcha
   atrás al subir y vuelven a su ritmo al parar.
   ───────────────────────────────────────────────────────────────────────── */
function marquees() {
  const tracks = gsap.utils.toArray<HTMLElement>("[data-marquee]");
  if (!tracks.length) return;

  const loops = tracks.map((track) => {
    const duration = Number(track.dataset.marqueeDuration) || 32;
    const reversed = track.hasAttribute("data-marquee-reverse");
    /* Cada track lleva su contenido duplicado, así un viaje del -50% aterriza
       en un frame idéntico y el loop no tiene costura. */
    const tween = gsap.fromTo(
      track,
      { xPercent: reversed ? -50 : 0 },
      {
        xPercent: reversed ? 0 : -50,
        duration,
        ease: "none",
        repeat: -1,
      }
    );

    let hovered = false;
    track.addEventListener("pointerenter", () => {
      hovered = true;
      gsap.to(tween, { timeScale: 0.12, duration: 0.6, overwrite: true });
    });
    track.addEventListener("pointerleave", () => {
      hovered = false;
      gsap.to(tween, { timeScale: 1, duration: 0.8, overwrite: true });
    });

    return { tween, hovered: () => hovered };
  });

  const settle = () =>
    loops.forEach(({ tween, hovered }) => {
      if (!hovered())
        gsap.to(tween, { timeScale: 1, duration: 1, overwrite: true });
    });

  ScrollTrigger.create({
    onUpdate: (self) => {
      const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 900, 3);
      const sign = self.direction === -1 ? -1 : 1;
      loops.forEach(({ tween, hovered }) => {
        if (hovered()) return;
        gsap.to(tween, {
          timeScale: sign * boost,
          duration: 0.35,
          overwrite: true,
        });
      });
    },
  });
  ScrollTrigger.addEventListener("scrollEnd", settle);
}

/* ─────────────────────────────────────────────────────────────────────────
   Spotlight — un glow radial sigue al cursor dentro de cada tarjeta, como
   en la referencia. Solo con puntero real: en táctil un "hover" se pegaría.
   ───────────────────────────────────────────────────────────────────────── */
function spotlight() {
  document.querySelectorAll<HTMLElement>("[data-spotlight]").forEach((card) => {
    const glow = document.createElement("div");
    glow.className = "card-glow";
    glow.setAttribute("aria-hidden", "true");
    card.appendChild(glow);

    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      glow.style.setProperty("--mx", e.clientX - r.left + "px");
      glow.style.setProperty("--my", e.clientY - r.top + "px");
      glow.style.opacity = "1";
    });
    card.addEventListener("pointerleave", () => {
      glow.style.opacity = "0";
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Chrome — barra de progreso, scroll-to-top y navegación por anclas.
   ───────────────────────────────────────────────────────────────────────── */

/** Corre para todo el mundo: el botón tiene que funcionar con cualquier
    preferencia de movimiento. */
function scrollTopButton(reduced: boolean) {
  const toTop = document.getElementById("scroll-top");
  if (!toTop) return;

  ScrollTrigger.create({
    start: 320,
    end: "max",
    toggleClass: { targets: toTop, className: "visible" },
  });

  toTop.addEventListener("click", () =>
    gsap.to(window, {
      scrollTo: 0,
      duration: reduced ? 0 : 1.1,
      ease: "glide",
      overwrite: true,
    })
  );
}

function chrome() {
  const progress = document.getElementById("scroll-progress");

  /* Progreso de lectura sobre todo el documento. */
  if (progress) {
    gsap.to(progress, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
    });
  }

  /* Los anclas van con tween en vez de `scroll-behavior: smooth` — un solo
     vocabulario de easing para la página, y el offset del header se aplica
     aquí. (Con reduced motion esto nunca se registra, así el navegador salta
     directamente, como debe ser.) */
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;

    a.addEventListener("click", (e) => {
      e.preventDefault();
      gsap.to(window, {
        scrollTo: { y: target as Element, offsetY: HEADER_OFFSET },
        duration: 1.2,
        ease: "glide",
        overwrite: true,
      });
      history.replaceState(null, "", id);
    });
  });
}

/* ───────────────────────────────────────────────────────────────────────── */

const mm = gsap.matchMedia();
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

scrollTopButton(reduced);

/* El cielo corre para todos — con reduced-motion pinta un frame estático. */
sky();

/* Todo lo de abajo es movimiento por el movimiento mismo. Quien pidió menos
   recibe la página en su estado final — el bloque de reduced-motion de la
   hoja ya deja cada elemento revelado abierto. */
mm.add("(prefers-reduced-motion: no-preference)", () => {
  reveals();
  marquees();
  chrome();

  /* Las fuentes aterrizan tras el primer paint y cambian los quiebres. */
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
});

/* Efectos de puntero solo donde hay un puntero de verdad. */
mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
  spotlight();
});

document.documentElement.setAttribute("data-motion-ready", "");
