import { CalendarDays, Check, Mail, MessagesSquare } from "lucide-react";

const cardBase =
  "relative rounded-[14px] border border-[var(--card-line)] bg-[var(--card)] shadow-[var(--shadow-card)]";

function AccentBar({ color }: { color: string }) {
  return <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] rounded-t-[14px]" style={{ background: color }} />;
}

/** Sticky note: the student's first step. */
export function NoteCard() {
  return (
    <div className="relative w-[220px] rounded-[6px] bg-[var(--note)] px-6 pb-8 pt-7 text-[var(--note-ink)] shadow-[var(--shadow-soft)]">
      <span aria-hidden className="absolute left-1/2 top-3 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[var(--pin)] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.25)]" />
      <p className="landing-serif text-[17px] leading-[1.35]">
        Upload your CV to see how well you match with top tech roles at PAU instantly.
      </p>
      <span
        aria-hidden
        className="absolute -bottom-4 -left-4 grid h-12 w-12 rotate-[10deg] place-items-center rounded-xl border border-[var(--card-line)] bg-[var(--card)] shadow-[var(--shadow-soft)]"
      >
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent)] text-[var(--accent-ink)]">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      </span>
    </div>
  );
}

function MatchRing({ value }: { value: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--track)" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="var(--match)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
      />
    </svg>
  );
}

/** AI match result for one role. */
export function MatchCard() {
  return (
    <div className={`${cardBase} w-[250px] p-5 pt-6`}>
      <AccentBar color="var(--match)" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-[var(--match)]">AI Match</p>
          <p className="mt-2 text-[15px] font-semibold tracking-[-0.01em]">Frontend Engineer</p>
        </div>
        <div className="relative grid place-items-center">
          <MatchRing value={92} />
          <span className="landing-mono absolute text-[11px] font-medium">92</span>
        </div>
      </div>
      <p className="landing-mono mt-3 text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
        Missing: Tailwind, Next.js
      </p>
      <span className="landing-mono mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--match-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--match)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--match)]" />
        92% Match Score
      </span>
    </div>
  );
}

function QueueRow({ count, label, value, caption, color }: { count: number; label: string; value: number; caption: string; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="landing-mono grid h-5 min-w-5 place-items-center rounded-[5px] px-1 text-[10px] font-semibold text-[var(--badge-ink)]" style={{ background: color }}>
          {count}
        </span>
        <span className="text-[13.5px] font-medium">{label}</span>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--track)]">
          <span className="block h-full rounded-full" style={{ width: `${value}%`, background: color }} />
        </span>
        <span className="landing-mono text-[10.5px] uppercase tracking-[0.05em] text-[var(--muted)]">{caption}</span>
      </div>
    </div>
  );
}

/** What an employer sees first thing in the morning. */
export function QueueCard() {
  return (
    <div className={`${cardBase} w-[290px] p-5 pt-6`}>
      <AccentBar color="var(--accent)" />
      <p className="text-[15px] font-semibold tracking-[-0.01em]">Employer Queue</p>
      <div className="mt-5 space-y-5">
        <QueueRow count={14} label="Pending Applications" value={60} caption="60% needs review" color="var(--queue-alert)" />
        <QueueRow count={3} label="Schedule Interviews" value={100} caption="100%" color="var(--match)" />
      </div>
    </div>
  );
}

function Tile({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`grid h-[62px] w-[62px] place-items-center rounded-2xl border border-[var(--card-line)] bg-[var(--paper-raised)] text-[var(--ink)] shadow-[var(--shadow-soft)] ${className}`}
    >
      {children}
    </span>
  );
}

/** Everything flowing through the platform: messages, updates, interviews. */
export function StatsCard() {
  return (
    <div className={`${cardBase} w-[290px] p-5 pt-6`}>
      <AccentBar color="var(--violet)" />
      <p className="text-[15px] font-semibold tracking-[-0.01em]">Live Platform Stats</p>
      <div className="mt-7 flex justify-center -space-x-3 pb-2">
        <Tile className="relative z-30">
          <Mail className="h-6 w-6" strokeWidth={1.6} />
        </Tile>
        <Tile className="relative z-20 -translate-y-3">
          <MessagesSquare className="h-6 w-6 text-[var(--violet)]" strokeWidth={1.6} />
        </Tile>
        <Tile className="relative z-10 translate-y-2">
          <span className="flex flex-col items-center leading-none">
            <CalendarDays className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.8} />
            <span className="landing-mono mt-1 text-[15px] font-semibold">31</span>
          </span>
        </Tile>
      </div>
    </div>
  );
}
