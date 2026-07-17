"use client";

import { useEffect, useState } from "react";

import { BRAND } from "@/content";
import { HEADER, LINKS } from "@/content/marketing";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Container } from "./primitives";

// The landing header: transparent over the dark hero, then a sticky paper bar
// with a hairline base once the page scrolls (marketing.css flips the tokens on
// `data-scrolled`). A tiny client island only to read scroll position; the links
// + CTAs are plain anchors. Reduced-motion users get the same states without a
// transition (marketing.css drops it).
export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="mkt-header fixed inset-x-0 top-0 z-50"
      data-scrolled={scrolled}
    >
      <Container className="flex h-[68px] items-center gap-6">
        <a
          href="#top"
          className="flex items-center gap-2.5 font-display text-[21px] font-semibold tracking-tight"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={26} height={26} aria-hidden />
          {HEADER.wordmark}
        </a>

        <nav className="ml-2 hidden items-center gap-7 md:flex">
          {HEADER.links.map((link) => {
            const external = link.href.startsWith("http");
            return (
              <a
                key={link.label}
                href={link.href}
                className="mkt-nav-link text-body-md"
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <a
            href={LINKS.login}
            className="mkt-nav-link hidden text-body-md-medium sm:inline"
          >
            {HEADER.signIn.label}
          </a>
          <a
            href={HEADER.getStarted.href}
            className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
          >
            {HEADER.getStarted.label}
          </a>
        </div>
      </Container>
    </header>
  );
}
