"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeSwitch } from "./ThemeSwitch";

const linkBase =
  "h-9 items-center rounded-full px-3.5 text-[13.5px] font-medium transition-colors sm:h-10 sm:px-4 sm:text-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-[background-color,border-color] duration-300 ${
        scrolled ? "border-[var(--hairline)] bg-[color-mix(in_srgb,var(--paper)_82%,transparent)]" : "border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-8 lg:px-12" aria-label="Main">
        <Link href="/" aria-label="PAU InterConnect home" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]">
          <Image src="/favicon.ico" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
          <span className="hidden whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em] min-[420px]:inline">PAU InterConnect</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/login/admin" className={`${linkBase} hidden text-[var(--muted)] hover:text-[var(--ink)] lg:inline-flex`}>
            Admin
          </Link>
          <Link
            href="/login/employer"
            className={`${linkBase} inline-flex border border-[var(--hairline-strong)] text-[var(--ink)] hover:bg-[var(--hover)]`}
          >
            Employer
          </Link>
          <Link href="/login/student" className={`${linkBase} inline-flex bg-[var(--ink)] text-[var(--paper)] hover:opacity-90`}>
            Student
          </Link>
          <span aria-hidden className="mx-1 hidden h-5 w-px bg-[var(--hairline-strong)] sm:block" />
          <ThemeSwitch />
        </div>
      </nav>
    </header>
  );
}
