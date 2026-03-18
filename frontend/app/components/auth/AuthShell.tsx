"use client";

import React from "react";
import Link from "next/link";
import { Dumbbell, Sparkles, ArrowRight, Check } from "lucide-react";

const glassStyle: React.CSSProperties = {
  background: "hsla(220, 14%, 7%, 0.7)",
  backdropFilter: "blur(24px)",
  border: "1px solid hsla(220, 12%, 12%, 0.5)",
};

const glassElevatedStyle: React.CSSProperties = {
  background: "hsla(220, 14%, 9%, 0.82)",
  backdropFilter: "blur(24px)",
  border: "1px solid hsla(220, 12%, 12%, 0.6)",
};

const glowPrimary: React.CSSProperties = {
  boxShadow:
    "0 0 30px hsla(250, 75%, 62%, 0.15), 0 0 80px hsla(250, 75%, 62%, 0.05)",
};

const gradientHero: React.CSSProperties = {
  background:
    "radial-gradient(ellipse at 30% 20%, hsla(250, 75%, 62%, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, hsla(165, 70%, 48%, 0.08) 0%, transparent 55%)",
};

const textGradientStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, hsl(250, 75%, 62%), hsl(165, 70%, 48%))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

export type AuthShellProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  sideTitle?: React.ReactNode;
  sideSubtitle?: React.ReactNode;
  bullets?: string[];
};

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  sideTitle = (
    <>
      <span className="text-foreground">Welcome to </span><span style={textGradientStyle}>FitForge</span>
    </>
  ),
  sideSubtitle = "The all‑in‑one gym business OS for memberships, payments, and growth.",
  bullets = [
    "Glass-dark UI, built for focus",
    "Faster renewals with automation",
    "Real-time insights across branches",
  ],
}: AuthShellProps) {
  return (
    <div className="ff-auth min-h-screen bg-background flex items-stretch" style={gradientHero}>
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 w-full grid lg:grid-cols-2">
        <section className="hidden lg:flex flex-col justify-between px-10 xl:px-14 py-12">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-bold text-foreground">
                FitForge <span className="text-muted-foreground font-normal text-sm">Business OS</span>
              </div>
              <div className="text-xs text-muted-foreground">Secure admin access</div>
            </div>
          </div>

          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-sm" style={glassStyle}>
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
              <span className="text-muted-foreground">
                Trusted by <span className="text-foreground font-medium">1,000+ gyms</span>
              </span>
            </div>

            <h1 className="font-display text-4xl xl:text-5xl font-bold leading-[1.08] tracking-tight text-foreground mb-4">
              {sideTitle}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">{sideSubtitle}</p>

            <div className="space-y-3">
              {bullets.map((b) => (
                <div key={b} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <span className="text-foreground/90">{b}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary/70" />
            <span>No credit card required · Setup in under 24 hours</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 sm:px-6 lg:px-10 py-10">
          <div className="w-full max-w-[440px]">
            <div className="lg:hidden mb-8 flex items-center justify-center">
              <Link href="/landing" className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <span className="font-display text-lg font-bold text-foreground">
                  FitForge <span className="text-muted-foreground font-normal text-sm">Business OS</span>
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-1" />
              </Link>
            </div>

            <div className="rounded-3xl p-1" style={{ ...glassElevatedStyle, ...glowPrimary }}>
              <div className="rounded-2xl bg-background/40 px-6 sm:px-8 py-7" style={glassStyle}>
                <div className="mb-6">
                  <div className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {title}
                  </div>
                  {subtitle ? (
                    <div className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {subtitle}
                    </div>
                  ) : null}
                </div>

                {children}

                {footer ? <div className="mt-6">{footer}</div> : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

