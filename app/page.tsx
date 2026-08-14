import Link from "next/link";
import { CheckSquare, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const ledger = [
  { name: "requirement-analysis.spec", status: "pass" as const, time: "412ms" },
  { name: "checkout-boundary-cases.spec", status: "pass" as const, time: "1.8s" },
  { name: "auth-session-expiry.spec", status: "fail" as const, time: "640ms" },
  { name: "api-rate-limit.spec", status: "pass" as const, time: "203ms" },
  { name: "cart-negative-qty.spec", status: "warn" as const, time: "88ms" },
];

const capabilities = [
  {
    title: "Requirement analysis",
    body: "Surfaces ambiguity, missing acceptance criteria, and unstated risk before a single test is written.",
  },
  {
    title: "Test case generation",
    body: "Functional, negative, boundary, edge, and security cases — drafted, never auto-approved.",
  },
  {
    title: "Playwright automation",
    body: "Converts reviewed test cases into typed, Page-Object-Model automation with real locators and assertions.",
  },
  {
    title: "Risk prediction",
    body: "Ranks modules by defect history, change frequency, and coverage gaps so review time goes where it matters.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" strokeWidth={2.5} />
          <span className="font-display text-base font-semibold tracking-tight">
            QA Intelligence Platform
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="container grid gap-12 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Quality engineering, instrumented
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
              Every requirement has a blind spot. <em className="italic text-primary">Find it before your users do.</em>
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              An AI-assisted workspace for QA engineers: analyze requirements,
              generate test cases and automation, run regressions, and see
              which modules are actually risky — with a human reviewing every
              AI-drafted artifact before it counts.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/register">
                  Create an account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          {/* Signature element: a ledger readout. Tick/cross/warn marks are
              structural here, not decorative — they're literally what a
              test run produces. */}
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
              <span className="font-mono text-xs text-muted-foreground">
                regression-suite · run #482
              </span>
              <span className="font-mono text-xs text-muted-foreground">4 / 5 passed</span>
            </div>
            <ul className="divide-y">
              {ledger.map((item) => (
                <li key={item.name} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <StatusMark status={item.status} />
                    <span className="font-mono text-sm">{item.name}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t bg-card/50">
          <div className="container py-16">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              What the platform actually does
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((cap) => (
                <div key={cap.title} className="rounded-lg border bg-card p-5">
                  <h3 className="font-display text-base font-semibold">{cap.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{cap.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container flex h-16 items-center justify-between text-sm text-muted-foreground">
          <span>QA Intelligence Platform</span>
          <span className="font-mono text-xs">Phase 1 — Foundation</span>
        </div>
      </footer>
    </div>
  );
}

function StatusMark({ status }: { status: "pass" | "fail" | "warn" }) {
  if (status === "pass") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pass/15 text-pass">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "fail") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fail/15 text-fail">
        <X className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warn/15 text-warn font-mono text-[10px] font-bold">
      !
    </span>
  );
}
