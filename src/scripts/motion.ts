/**
 * Page motion — GSAP.
 *
 * Division of labour with global.css: the stylesheet owns the hero's load-time
 * entrance (it paints before this module parses, so the fold is never blank and
 * never waits on JS). Everything that depends on scroll position, runs forever,
 * or answers the pointer lives here.
 *
 * The stylesheet also holds the pre-motion state of every revealed element, so
 * nothing flashes in before GSAP takes over. `.js-motion` (set inline in the
 * head) kills the CSS transitions on those elements — GSAP writes the same
 * properties frame by frame and the two systems must not both drive them.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(
  ScrollTrigger,
  ScrollToPlugin,
  DrawSVGPlugin,
  CustomEase,
  SplitText
);

/* The page's three motion curves, ported from the CSS custom properties so a
   GSAP tween and a CSS transition on the same page land the same way. */
CustomEase.create("soft", "M0,0 C0.12,0.23 0.17,0.99 1,1");
CustomEase.create("glide", "M0,0 C0.12,0.23 0.5,1 1,1");
CustomEase.create("swift", "M0,0 C0.35,0 0,1 1,1");

gsap.defaults({ ease: "soft", duration: 1 });

/** The fixed header's height — anchor targets have to clear it. */
const HEADER_OFFSET = 88;

/* ─────────────────────────────────────────────────────────────────────────
   Scroll reveal — replaces the IntersectionObserver the page used to run.
   Same vocabulary as before (rise out of a blur, soft, zoom, fade), but
   batched: elements that cross the line together enter as one staggered
   group instead of each firing on its own timer.
   ───────────────────────────────────────────────────────────────────────── */
interface RevealVariant {
  from: gsap.TweenVars;
  to: gsap.TweenVars;
}

const REVEALS: Record<string, RevealVariant> = {
  "": {
    from: { opacity: 0, y: 40, filter: "blur(10px)" },
    to: { opacity: 1, y: 0, filter: "blur(0px)", duration: 1 },
  },
  soft: {
    from: { opacity: 0, y: 20, filter: "blur(4px)" },
    to: { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8 },
  },
  zoom: {
    from: { opacity: 1, scale: 1.05 },
    to: { opacity: 1, scale: 1, duration: 1.6, ease: "glide" },
  },
  fade: {
    from: { opacity: 0 },
    to: { opacity: 1, duration: 1 },
  },
};

function reveals() {
  const all = gsap.utils.toArray<HTMLElement>("[data-reveal]");

  /* One batch per variant — mixing a rise and a zoom into the same stagger
     would hand them the same tween vars. */
  for (const [variant, spec] of Object.entries(REVEALS)) {
    const els = all.filter((el) => (el.dataset.reveal ?? "") === variant);
    if (!els.length) continue;

    gsap.set(els, { ...spec.from, willChange: "transform, opacity, filter" });

    ScrollTrigger.batch(els, {
      start: "top 90%",
      once: true,
      interval: 0.12,
      batchMax: 6,
      onEnter: (batch) =>
        gsap.to(batch, {
          ...spec.to,
          stagger: 0.09,
          overwrite: true,
          onComplete() {
            /* Hand the element back to the stylesheet's finished state, then
               strip every inline property GSAP wrote. Two reasons: a lingering
               blur filter would keep each revealed section on its own
               compositing layer for the rest of the session, and a lingering
               inline transform would outrank the `hover:-translate-y-1` on the
               cards underneath. */
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
   Section headlines — split into lines and pushed up out of a mask, so each
   line arrives on its own beat instead of the block fading in whole.
   ───────────────────────────────────────────────────────────────────────── */
function splitHeadlines() {
  gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      /* Re-splits when the line breaks change (resize, font swap) and
         re-runs onSplit, so a headline never ends up half-animated. */
      autoSplit: true,
      onSplit(self) {
        gsap.set(el, { visibility: "visible" });
        return gsap.from(self.lines, {
          yPercent: 115,
          opacity: 0,
          duration: 1,
          stagger: 0.11,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      },
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Hero — the orbit figure draws itself, then never stops turning. The rings
   carry their nodes: each node is a parametric point of the ellipse it is
   grouped with, so rotating the group walks the node along its own ring.
   ───────────────────────────────────────────────────────────────────────── */
function hero() {
  const figure = document.querySelector<HTMLElement>("[data-orbit]");
  if (!figure) return;

  const rings = gsap.utils.toArray<SVGGElement>("[data-orbit-ring]", figure);
  const strokes = gsap.utils.toArray<SVGElement>(
    "[data-orbit-ring] ellipse",
    figure
  );
  const nodes = gsap.utils.toArray<SVGCircleElement>(
    "[data-orbit-node]",
    figure
  );
  const halo = figure.querySelector<SVGCircleElement>("[data-orbit-halo]");

  /* Set the drawn-out state now rather than inside the delayed timeline —
     any gap here is a frame of fully drawn rings. */
  gsap.set(strokes, { drawSVG: "0%" });
  gsap.set(nodes, { scale: 0, transformOrigin: "center", opacity: 0 });
  if (halo) gsap.set(halo, { drawSVG: "0%" });

  const entrance = gsap.timeline({ delay: 0.45 });
  entrance
    .from(figure, { scale: 1.06, duration: 2, ease: "glide" }, 0)
    .to(strokes, { drawSVG: "100%", duration: 2.2, stagger: 0.16 }, 0);
  if (halo) entrance.to(halo, { drawSVG: "100%", duration: 1.8 }, 0.3);
  entrance
    .to(
      nodes,
      {
        scale: 1,
        opacity: 1,
        duration: 0.9,
        stagger: 0.14,
        ease: "back.out(2.2)",
      },
      1.1
    );

  /* Each ring turns at its own pace and its own direction — three periods
     that never line up, so the figure never repeats a pose. */
  rings.forEach((ring, i) => {
    gsap.to(ring, {
      rotation: i % 2 === 0 ? "+=360" : "-=360",
      svgOrigin: "260 232",
      duration: 120 + i * 34,
      repeat: -1,
      ease: "none",
    });
  });

  /* Nodes breathe out of phase with the rings they ride. */
  gsap.to(nodes, {
    opacity: 0.45,
    duration: 2.4,
    repeat: -1,
    yoyo: true,
    stagger: { each: 0.6, from: "random" },
    ease: "sine.inOut",
    delay: 2.2,
  });

  /* Parallax out of the fold: the claim leaves faster than the figure, and
     the figure sinks — the two layers separate as the hero scrolls away. */
  const parallax = {
    ease: "none" as const,
    scrollTrigger: {
      trigger: "#hero",
      start: "top top",
      end: "bottom top",
      scrub: 0.5,
    },
  };
  gsap.to("[data-hero-copy]", { y: -80, opacity: 0.15, ...parallax });
  gsap.to(figure, { y: 70, scale: 0.9, opacity: 0.25, ...parallax });
}

/* Stat rails count up to their value the first time they are seen. */
function counters() {
  gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count);
    if (!Number.isFinite(end)) return;
    const suffix = el.dataset.countSuffix ?? "";
    const value = { n: 0 };

    gsap.to(value, {
      n: end,
      duration: 2,
      delay: 0.6,
      ease: "swift",
      snap: { n: 1 },
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
      onUpdate: () => {
        el.textContent = `${Math.round(value.n)}${suffix}`;
      },
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Marquees — the client roster and the stack rails. GSAP drives them instead
   of a CSS keyframe so they can answer the scroll: they speed up with the
   page, run backwards when you scroll up, and coast back to their own pace
   when you stop.
   ───────────────────────────────────────────────────────────────────────── */
function marquees() {
  const tracks = gsap.utils.toArray<HTMLElement>("[data-marquee]");
  if (!tracks.length) return;

  const loops = tracks.map((track) => {
    const duration = Number(track.dataset.marqueeDuration) || 32;
    const reversed = track.hasAttribute("data-marquee-reverse");
    /* Each track holds its content twice over, so a -50% travel lands back
       on an identical frame and the loop has no seam. */
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

/* The process rail draws itself across the four steps as the section arrives. */
function processRail() {
  const rail = document.querySelector<HTMLElement>("[data-rail]");
  if (!rail) return;

  gsap.from(rail, {
    scaleX: 0,
    transformOrigin: "left center",
    ease: "none",
    scrollTrigger: {
      trigger: rail,
      start: "top 85%",
      end: "top 40%",
      scrub: 0.6,
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Pointer response — project cards tilt towards the cursor and the mockup
   inside them lags behind, which is what reads as depth.
   ───────────────────────────────────────────────────────────────────────── */
function tilt() {
  gsap.utils.toArray<HTMLElement>("[data-tilt]").forEach((card) => {
    const inner = card.querySelector<HTMLElement>("[data-tilt-inner]");
    const opts = { duration: 0.7, ease: "power3.out" };

    /* Perspective lives on the grid in CSS, not here — the reveal clears every
       inline property when it finishes, and a shared vanishing point makes the
       row tilt like one surface anyway. */

    const rotX = gsap.quickTo(card, "rotationX", opts);
    const rotY = gsap.quickTo(card, "rotationY", opts);
    const lift = gsap.quickTo(card, "y", opts);
    const innerX = inner ? gsap.quickTo(inner, "x", opts) : null;
    const innerY = inner ? gsap.quickTo(inner, "y", opts) : null;

    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      rotY(px * 7);
      rotX(-py * 7);
      lift(-6);
      innerX?.(px * -14);
      innerY?.(py * -10);
    });

    card.addEventListener("pointerleave", () => {
      rotX(0);
      rotY(0);
      lift(0);
      innerX?.(0);
      innerY?.(0);
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Chrome — header, reading progress, scroll-to-top, anchor navigation.
   ───────────────────────────────────────────────────────────────────────── */

/** Runs for everyone: the button has to work whatever the motion preference. */
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
  const header = document.getElementById("site-header");
  const progress = document.getElementById("scroll-progress");

  /* Reading progress across the whole document. */
  if (progress) {
    gsap.to(progress, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
    });
  }

  /* The header gets out of the way going down and comes back on the way up.
     It only starts doing that below 220px, so the fold keeps its nav. */
  if (header) {
    ScrollTrigger.create({
      start: 220,
      end: "max",
      onUpdate: (self) =>
        gsap.to(header, {
          yPercent: self.direction === 1 ? -110 : 0,
          duration: 0.45,
          ease: "swift",
          overwrite: true,
        }),
      onLeaveBack: () => gsap.to(header, { yPercent: 0, duration: 0.3 }),
    });
  }

  /* Anchors are tweened rather than handed to `scroll-behavior: smooth` —
     one easing vocabulary for the page, and the header offset is applied
     here instead of relying on scroll-margin. (Under reduced motion this
     never registers, so the browser jumps straight there, as it should.) */
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

/* Everything below is motion for its own sake. Users who asked for less get
   the page in its finished state — the stylesheet's reduced-motion block
   already pins every revealed element open. */
mm.add("(prefers-reduced-motion: no-preference)", () => {
  reveals();
  splitHeadlines();
  hero();
  counters();
  marquees();
  processRail();
  chrome();

  /* Fonts land after first paint and change where the lines break. */
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
});

/* Pointer effects only where there is a real pointer — on touch, a "hover"
   tilt would stick after the tap. */
mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
  tilt();
});

document.documentElement.setAttribute("data-motion-ready", "");
