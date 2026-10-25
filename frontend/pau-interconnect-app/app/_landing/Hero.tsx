"use client";

import Link from "next/link";
import { useRef } from "react";
import { Building2 } from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { MatchCard, NoteCard, QueueCard, StatsCard } from "./ProductCards";

const EASE = [0.22, 1, 0.36, 1] as const;

type FloatSpec = {
  id: string;
  card: React.ReactNode;
  position: string;
  rotate: number;
  depth: number;
  float: number;
  delay: number;
  from: { x?: number; y?: number };
};

const FLOATING: FloatSpec[] = [
  { id: "note", card: <NoteCard />, position: "left-[4%] top-[11%] 2xl:left-[9%]", rotate: -6, depth: 22, float: 9, delay: 0.35, from: { x: -40 } },
  { id: "match", card: <MatchCard />, position: "right-[4%] top-[9%] 2xl:right-[9%]", rotate: 5, depth: 30, float: 11, delay: 0.5, from: { x: 40 } },
  { id: "queue", card: <QueueCard />, position: "left-[6%] bottom-[9%] 2xl:left-[12%]", rotate: -2, depth: 16, float: 7, delay: 0.65, from: { y: 40 } },
  { id: "stats", card: <StatsCard />, position: "right-[6%] bottom-[12%] 2xl:right-[12%]", rotate: 2, depth: 26, float: 10, delay: 0.8, from: { y: 40 } },
];

function FloatingCard({ spec, pointerX, pointerY, still }: { spec: FloatSpec; pointerX: MotionValue<number>; pointerY: MotionValue<number>; still: boolean }) {
  const x = useTransform(pointerX, (v) => v * spec.depth);
  const y = useTransform(pointerY, (v) => v * spec.depth);
  return (
    // Each layer owns one effect: pointer parallax → entrance → idle float → hover.
    <motion.div className={`absolute z-[5] ${spec.position}`} style={{ x, y }}>
      <motion.div
        initial={{ opacity: 0, ...spec.from }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.9, delay: spec.delay, ease: EASE }}
      >
        <motion.div
          animate={still ? undefined : { y: [0, -spec.float, 0] }}
          transition={{ duration: 5 + spec.float / 3, repeat: Infinity, ease: "easeInOut", delay: spec.delay }}
        >
          <motion.div
            initial={{ rotate: spec.rotate }}
            whileHover={{ rotate: 0, scale: 1.03, transition: { duration: 0.35, ease: EASE } }}
          >
            {spec.card}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

const line = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: (i: number) => ({ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, delay: 0.08 + i * 0.09, ease: EASE } }),
};

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const still = useReducedMotion() ?? false;
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const pointerX = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 });
  const pointerY = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 });

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (still || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    rawX.set(((e.clientX - r.left) / r.width - 0.5) * -1);
    rawY.set(((e.clientY - r.top) / r.height - 0.5) * -1);
  };
  const onPointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <section
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative isolate overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div aria-hidden className="landing-dots absolute inset-0 -z-10" />

      <div className="relative mx-auto flex min-h-[calc(100svh-72px)] max-w-[1440px] items-center justify-center px-5 pb-20 pt-16 sm:px-8 xl:min-h-[820px] xl:pb-28 xl:pt-10">
        <div className="relative z-10 mx-auto max-w-[780px] text-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mx-auto mb-9 grid h-14 w-14 place-items-center rounded-2xl border border-[var(--card-line)] bg-[var(--card)] text-[var(--accent)] shadow-[var(--shadow-card)]"
          >
            <Building2 className="h-6 w-6" strokeWidth={1.7} aria-hidden />
          </motion.span>

          <h1 id="hero-title" className="text-balance text-[clamp(2.4rem,4.4vw,3.65rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
            <motion.span className="block" variants={line} initial="hidden" animate="show" custom={0}>
              Internships and Recruiting
            </motion.span>
            <motion.span
              className="landing-serif mt-1 block text-[1.12em] font-normal italic leading-[1] tracking-[-0.01em] text-[var(--muted)]"
              variants={line}
              initial="hidden"
              animate="show"
              custom={1}
            >
              powered by AI matching
            </motion.span>
          </h1>

          <motion.p
            variants={line}
            initial="hidden"
            animate="show"
            custom={2}
            className="mx-auto mt-7 max-w-[440px] text-pretty text-[17px] leading-[1.6] text-[var(--muted)]"
          >
            Students tailor CVs instantly. Employers find top talent accurately.
          </motion.p>

          <motion.div variants={line} initial="hidden" animate="show" custom={3} className="mt-10">
            <Link
              href="/onboarding"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-[var(--accent)] px-7 text-[15px] font-medium text-[var(--accent-ink)] shadow-[0_10px_24px_-12px_var(--accent)] transition-[background-color,transform] duration-200 hover:bg-[var(--accent-hover)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--accent)]"
            >
              Get started
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </motion.div>
        </div>

        {/* Floating product cards (wide screens) */}
        <div className="pointer-events-none absolute inset-0 hidden xl:block">
          <div className="pointer-events-auto">
            {FLOATING.map((spec) => (
              <FloatingCard key={spec.id} spec={spec} pointerX={pointerX} pointerY={pointerY} still={still} />
            ))}
          </div>
        </div>
      </div>

      {/* The same cards, laid out as a grid below the fold on smaller screens */}
      <div className="mx-auto grid max-w-[720px] grid-cols-1 justify-items-center gap-x-6 gap-y-10 px-5 pb-20 sm:grid-cols-2 sm:px-8 xl:hidden">
        {FLOATING.map((spec, i) => (
          <motion.div
            key={spec.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: (i % 2) * 0.08, ease: EASE }}
            style={{ rotate: spec.rotate / 2 }}
          >
            {spec.card}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
