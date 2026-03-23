"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Dumbbell,
  Menu,
  X,
  ArrowRight,
  Play,
  TrendingUp,
  Users,
  DollarSign,
  CalendarCheck,
  CreditCard,
  ScanLine,
  UserCheck,
  Bell,
  BarChart3,
  Building2,
  Check,
  Zap,
  Sparkles,
  ChevronDown,
  MapPin,
  Star,
  Quote,
  Clock,
} from "lucide-react";

const glassStyle: React.CSSProperties = {
  background: "hsla(220, 14%, 7%, 0.7)",
  backdropFilter: "blur(24px)",
  border: "1px solid hsla(220, 12%, 12%, 0.5)",
};
const glassElevatedStyle: React.CSSProperties = {
  background: "hsla(220, 14%, 9%, 0.8)",
  backdropFilter: "blur(24px)",
  border: "1px solid hsla(220, 12%, 12%, 0.6)",
};
const glowPrimary: React.CSSProperties = {
  boxShadow:
    "0 0 30px hsla(250, 75%, 62%, 0.15), 0 0 80px hsla(250, 75%, 62%, 0.05)",
};
const glowAccent: React.CSSProperties = {
  boxShadow:
    "0 0 30px hsla(165, 70%, 48%, 0.15), 0 0 80px hsla(165, 70%, 48%, 0.05)",
};
const gradientHero: React.CSSProperties = {
  background:
    "radial-gradient(ellipse at 30% 20%, hsla(250, 75%, 62%, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, hsla(165, 70%, 48%, 0.08) 0%, transparent 55%)",
};
const gradientMesh: React.CSSProperties = {
  background:
    "radial-gradient(ellipse at 20% 30%, hsla(250, 75%, 62%, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 60%, hsla(165, 70%, 48%, 0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 90%, hsla(30, 90%, 58%, 0.03) 0%, transparent 50%)",
};
const textGradientStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, hsl(250, 75%, 62%), hsl(165, 70%, 48%))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  textShadow:
    "0 0 22px hsla(250, 75%, 62%, 0.22), 0 0 34px hsla(165, 70%, 48%, 0.18)",
};
const textGradientWarmStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, hsl(30, 90%, 58%), hsl(250, 75%, 62%))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  textShadow:
    "0 0 18px hsla(30, 90%, 58%, 0.18), 0 0 30px hsla(250, 75%, 62%, 0.2)",
};

const TextGradient: React.FC<{
  children: React.ReactNode;
  warm?: boolean;
}> = ({ children, warm }) => (
  <span style={warm ? textGradientWarmStyle : textGradientStyle}>
    {children}
  </span>
);

const Btn: React.FC<{
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  href?: string;
  style?: React.CSSProperties;
}> = ({
  children,
  variant = "default",
  size = "md",
  className = "",
  onClick,
  href,
  style,
}) => {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-sm",
    lg: "h-13 px-8 text-base",
  };
  const variants = {
    default:
      "bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-[1.02]",
    outline:
      "border border-border bg-transparent hover:bg-secondary text-foreground",
    ghost:
      "bg-transparent hover:bg-secondary text-muted-foreground hover:text-foreground",
  };
  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className={classes}
      style={style}
    >
      {children}
    </button>
  );
};

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#demo" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-border/50 shadow-lg" : "bg-transparent"
      }`}
      style={scrolled ? glassStyle : {}}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 lg:h-18">
        <a href="#" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display text-lg font-bold text-foreground" >
            FitForge{" "}
            <span className="text-muted-foreground font-normal text-sm">
              Business OS
            </span>
          </span>
        </a>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Btn variant="ghost" size="sm" href="/login">
            Log in
          </Btn>
          <Btn size="sm" className="group" style={glowPrimary} href="/signup">
            Start Free Trial
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Btn>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="md:hidden text-foreground p-2"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border/50 overflow-hidden"
            style={glassStyle}
          >
            <div className="px-4 py-5 space-y-1">
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block text-sm text-muted-foreground hover:text-foreground py-2.5 px-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <div className="pt-3 space-y-2">
                <Btn variant="outline" className="w-full" href="/login">
                  Log in
                </Btn>
                <Btn className="w-full" style={glowPrimary} href="/signup">
                  Start Free Trial
                </Btn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => (
  <section
    className="relative min-h-screen flex items-center pt-20 overflow-hidden"
    style={gradientHero}
  >
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
    />
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center lg:text-left"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-sm"
            style={glassStyle}
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
            <span className="text-muted-foreground">
              Trusted by{" "}
              <span className="text-foreground font-medium">1,000+ gyms</span>
            </span>
          </motion.div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold leading-[1.08] mb-6 tracking-tight">
            Manage Your Gym. <TextGradient>Grow Your Revenue.</TextGradient>{" "}
            Automate Everything.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
            All-in-one gym management software to handle memberships, payments,
            attendance, and client engagement — so you can focus on what
            matters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
            <Btn
              size="lg"
              className="text-base font-semibold group"
              style={glowPrimary}
              href="/signup"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </Btn>
            <Btn
              size="lg"
              variant="outline"
              className="text-base font-semibold border-border hover:border-primary/40 hover:bg-primary/5 group"
            >
              <Play className="w-4 h-4 mr-2 text-primary" />
              Book Demo
            </Btn>
          </div>
          <div className="flex flex-wrap gap-6 justify-center lg:justify-start">
            {[
              {
                icon: TrendingUp,
                label: "30% more renewals",
                color: "text-accent",
              },
              { icon: Users, label: "50% less admin work", color: "text-primary" },
              {
                icon: DollarSign,
                label: "2x revenue growth",
                color: "text-warm",
              },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-2">
                <m.icon className={`w-4 h-4 ${m.color}`} />
                <span className="text-sm text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="relative"
        >
          <div
            className="rounded-2xl p-1"
            style={{ ...glassElevatedStyle, ...glowPrimary }}
          >
            <div className="bg-background rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warm/60" />
                  <div className="w-3 h-3 rounded-full bg-accent/60" />
                </div>
                <div className="flex-1 mx-8">
                  <div className="w-48 h-6 rounded-md bg-secondary mx-auto flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">
                      dashboard.fitforge.io
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Welcome back
                    </p>
                    <p className="text-sm font-semibold font-display">
                      FitZone Pro Gym
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      March 2026
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Revenue",
                      value: "₹4,82,000",
                      change: "+18%",
                      color: "text-accent",
                    },
                    {
                      label: "Active Members",
                      value: "847",
                      change: "+12%",
                      color: "text-primary",
                    },
                    {
                      label: "Renewals",
                      value: "94.2%",
                      change: "+5.3%",
                      color: "text-warm",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-secondary/60 rounded-xl p-3"
                    >
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {s.label}
                      </p>
                      <p className="text-sm font-bold font-display text-foreground">
                        {s.value}
                      </p>
                      <p className={`text-[10px] font-medium ${s.color}`}>
                        {s.change}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="bg-secondary/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold">Revenue Overview</p>
                    <span className="text-[10px] text-primary font-medium">
                      This Quarter
                    </span>
                  </div>
                  <div className="flex items-end gap-2 h-24">
                    {[35, 42, 38, 55, 48, 65, 72, 68, 80, 75, 88, 92].map(
                      (h, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/60 to-primary/20"
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{
                            duration: 0.5,
                            delay: 0.8 + i * 0.06,
                          }}
                        />
                      )
                    )}
                  </div>
                </div>
                <div className="bg-secondary/40 rounded-xl p-3">
                  <p className="text-xs font-semibold mb-2">Recent Members</p>
                  {[
                    {
                      name: "Arjun Mehta",
                      plan: "Pro Annual",
                      status: "Active",
                    },
                    {
                      name: "Priya Sharma",
                      plan: "Starter Monthly",
                      status: "Active",
                    },
                    {
                      name: "Rohan Das",
                      plan: "Pro Annual",
                      status: "Due",
                    },
                  ].map((m) => (
                    <div
                      key={m.name}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-primary">
                            {m.name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-foreground">
                            {m.name}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {m.plan}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full ${
                          m.status === "Active"
                            ? "bg-accent/10 text-accent"
                            : "bg-warm/10 text-warm"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

const testimonials = [
  {
    name: "Rajesh Patel",
    role: "Owner, Iron Fitness Gym",
    text: "FitForge cut our admin time by 60%. Automated billing alone saved us hours every week. Revenue is up 35% since we switched.",
    rating: 5,
  },
  {
    name: "Ananya Iyer",
    role: "Founder, FlexStudio",
    text: "Managing 3 branches was chaos before FitForge. Now I see everything in one dashboard — members, revenue, attendance. Game changer.",
    rating: 5,
  },
  {
    name: "Mike Thompson",
    role: "Personal Trainer & Studio Owner",
    text: "My clients love the reminders and workout plans. Retention went from 65% to 91%. I can't imagine running my business without it.",
    rating: 5,
  },
];

const metrics = [
  { value: "1,000+", label: "Gyms Onboarded" },
  { value: "2.5M+", label: "Members Managed" },
  { value: "₹120Cr+", label: "Revenue Processed" },
  { value: "99.9%", label: "Uptime" },
];

const SocialProof = () => (
  <section className="py-20 sm:py-28 border-t border-border/50">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center"
          >
            <p className="font-display text-3xl sm:text-4xl font-bold mb-1">
              <TextGradient>{m.value}</TextGradient>
            </p>
            <p className="text-sm text-muted-foreground">{m.label}</p>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
          Gym Owners <TextGradient>Love FitForge</TextGradient>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Don&apos;t just take our word for it — hear from real gym owners who
          transformed their business.
        </p>
      </motion.div>
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className="rounded-2xl p-6 sm:p-8 hover:translate-y-[-4px] transition-all duration-300"
            style={glassStyle}
          >
            <Quote className="w-8 h-8 text-primary/20 mb-4" />
            <p className="text-foreground/90 leading-relaxed mb-6 text-sm">
              {t.text}
            </p>
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star
                  key={j}
                  className="w-3.5 h-3.5 fill-warm text-warm"
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const features = [
  {
    icon: Users,
    title: "Membership Management",
    description:
      "Create, renew, and track plans easily. Automate renewals and send expiry alerts.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: CreditCard,
    title: "Automated Billing & Payments",
    description:
      "UPI, cards, auto-reminders, and auto-renewals. Never miss a payment again.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: ScanLine,
    title: "Attendance Tracking",
    description:
      "QR code, biometric, or manual check-in. Real-time attendance logs and reports.",
    color: "text-warm",
    bg: "bg-warm/10",
  },
  {
    icon: UserCheck,
    title: "Trainer & Staff Management",
    description:
      "Assign trainers, track performance, manage schedules, and monitor payroll.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Bell,
    title: "Client Engagement",
    description:
      "Push notifications, workout plans, birthday wishes, and personalized reminders.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description:
      "Revenue, retention, growth insights — everything you need to make data-driven decisions.",
    color: "text-warm",
    bg: "bg-warm/10",
  },
];

const Features = () => (
  <section id="features" className="py-20 sm:py-28" style={gradientMesh}>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="text-primary text-xs font-semibold tracking-widest uppercase mb-4 block">
          Core Features
        </span>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
          Everything to Run a <TextGradient>Modern Gym</TextGradient>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Six powerful modules working together as your complete gym business
          operating system.
        </p>
      </motion.div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl p-6 sm:p-7 group hover:translate-y-[-4px] transition-all duration-300 cursor-default"
            style={glassStyle}
          >
            <div
              className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
            >
              <f.icon className={`w-5 h-5 ${f.color}`} />
            </div>
            <h3 className="font-display text-base font-semibold mb-2 text-foreground">
              {f.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {f.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

interface DemoContent {
  title: string;
  subtitle: string;
  chart?: number[];
  total?: string;
  growth?: string;
  details?: { label: string; value: string; pct: number }[];
  members?: {
    name: string;
    plan: string;
    joined: string;
    status: string;
  }[];
  payments?: {
    name: string;
    amount: string;
    date: string;
    status: string;
    method: string;
  }[];
  weekData?: { day: string; count: number; pct: number }[];
}

const demoTabs: { id: string; label: string; icon: typeof BarChart3; content: DemoContent }[] = [
  {
    id: "revenue",
    label: "Revenue",
    icon: BarChart3,
    content: {
      title: "Revenue Overview",
      subtitle:
        "Track earnings, predict trends, and optimize pricing.",
      chart: [35, 42, 55, 48, 65, 72, 68, 80, 85, 78, 92, 96],
      total: "₹4,82,000",
      growth: "+18.4%",
      details: [
        { label: "Memberships", value: "₹3,20,000", pct: 66 },
        { label: "Personal Training", value: "₹1,10,000", pct: 23 },
        { label: "Supplements", value: "₹52,000", pct: 11 },
      ],
    },
  },
  {
    id: "members",
    label: "Members",
    icon: Users,
    content: {
      title: "Member Directory",
      subtitle: "Full visibility of your member base at a glance.",
      members: [
        {
          name: "Arjun Mehta",
          plan: "Pro Annual",
          joined: "Jan 2026",
          status: "Active",
        },
        {
          name: "Priya Sharma",
          plan: "Starter Monthly",
          joined: "Feb 2026",
          status: "Active",
        },
        {
          name: "Rohan Das",
          plan: "Pro Annual",
          joined: "Dec 2025",
          status: "Expiring",
        },
        {
          name: "Sneha Reddy",
          plan: "Pro Quarterly",
          joined: "Mar 2026",
          status: "Active",
        },
        {
          name: "Vikram Singh",
          plan: "Starter Monthly",
          joined: "Mar 2026",
          status: "New",
        },
      ],
    },
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
    content: {
      title: "Payment Status",
      subtitle: "Automated billing with real-time payment tracking.",
      payments: [
        {
          name: "Arjun M.",
          amount: "₹12,000",
          date: "Mar 15",
          status: "Paid",
          method: "UPI",
        },
        {
          name: "Priya S.",
          amount: "₹3,000",
          date: "Mar 14",
          status: "Paid",
          method: "Card",
        },
        {
          name: "Rohan D.",
          amount: "₹12,000",
          date: "Mar 10",
          status: "Pending",
          method: "—",
        },
        {
          name: "Sneha R.",
          amount: "₹8,500",
          date: "Mar 12",
          status: "Paid",
          method: "UPI",
        },
      ],
    },
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    content: {
      title: "Attendance Logs",
      subtitle: "QR and biometric check-ins tracked automatically.",
      weekData: [
        { day: "Mon", count: 124, pct: 82 },
        { day: "Tue", count: 98, pct: 65 },
        { day: "Wed", count: 115, pct: 76 },
        { day: "Thu", count: 132, pct: 87 },
        { day: "Fri", count: 108, pct: 71 },
        { day: "Sat", count: 145, pct: 96 },
        { day: "Sun", count: 67, pct: 44 },
      ],
    },
  },
];

const ProductDemo = () => {
  const [active, setActive] = useState(0);
  const tab = demoTabs[active];
  return (
    <section id="demo" className="py-20 sm:py-28 border-t border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-accent text-xs font-semibold tracking-widest uppercase mb-4 block">
            Product Demo
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
            See Your Dashboard in <TextGradient>Action</TextGradient>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to run your gym — one dashboard, complete
            control.
          </p>
        </motion.div>
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-xl p-1.5 gap-1" style={glassStyle}>
            {demoTabs.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active === i
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <t.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto"
          style={{ ...glassElevatedStyle, ...glowPrimary }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-lg font-semibold">
                {tab.content.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {tab.content.subtitle}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-accent font-medium">
              <TrendingUp className="w-4 h-4" /> Live Data
            </div>
          </div>
          {tab.id === "revenue" && tab.content.chart && (
            <div className="space-y-6">
              <div className="flex items-end gap-4 mb-2">
                <span className="font-display text-3xl font-bold">
                  {tab.content.total}
                </span>
                <span className="text-accent text-sm font-semibold mb-1">
                  {tab.content.growth}
                </span>
              </div>
              <div className="flex items-end gap-1.5 h-36 bg-secondary/30 rounded-xl p-4">
                {tab.content.chart.map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-t bg-gradient-to-t from-primary to-primary/30"
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  />
                ))}
              </div>
              <div className="space-y-3">
                {tab.content.details?.map((d) => (
                  <div
                    key={d.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">
                      {d.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary/60"
                          initial={{ width: 0 }}
                          animate={{ width: `${d.pct}%` }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground w-24 text-right">
                        {d.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab.id === "members" && tab.content.members && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 text-muted-foreground font-medium text-xs">
                      Name
                    </th>
                    <th className="text-left py-3 text-muted-foreground font-medium text-xs">
                      Plan
                    </th>
                    <th className="text-left py-3 text-muted-foreground font-medium text-xs hidden sm:table-cell">
                      Joined
                    </th>
                    <th className="text-right py-3 text-muted-foreground font-medium text-xs">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tab.content.members.map((m) => (
                    <tr key={m.name} className="border-b border-border/50">
                      <td className="py-3 font-medium text-foreground">
                        {m.name}
                      </td>
                      <td className="py-3 text-muted-foreground">{m.plan}</td>
                      <td className="py-3 text-muted-foreground hidden sm:table-cell">
                        {m.joined}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full ${
                            m.status === "Active"
                              ? "bg-accent/10 text-accent"
                              : m.status === "Expiring"
                                ? "bg-warm/10 text-warm"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab.id === "payments" && tab.content.payments && (
            <div className="space-y-3">
              {tab.content.payments.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between bg-secondary/40 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {p.name[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.date} · {p.method}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {p.amount}
                    </p>
                    <span
                      className={`text-[10px] font-medium ${
                        p.status === "Paid" ? "text-accent" : "text-warm"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab.id === "attendance" && tab.content.weekData && (
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {tab.content.weekData.map((d) => (
                <div key={d.day} className="text-center">
                  <div className="h-32 bg-secondary/30 rounded-lg flex items-end justify-center p-1 mb-2">
                    <motion.div
                      className="w-full rounded-t bg-gradient-to-t from-accent/80 to-accent/20"
                      initial={{ height: 0 }}
                      animate={{ height: `${d.pct}%` }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    />
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    {d.count}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{d.day}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

const befores = [
  "Manual registers & spreadsheets",
  "Missed payments, no follow-ups",
  "No data or tracking",
  "Admin chaos, wasted time",
  "Poor member retention",
];
const afters = [
  "Fully automated digital system",
  "Auto-billing with smart reminders",
  "Real-time analytics & insights",
  "Streamlined operations, saved hours",
  "91%+ retention with engagement tools",
];

const ProblemSolution = () => (
  <section className="py-20 sm:py-28" style={gradientMesh}>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="text-warm text-xs font-semibold tracking-widest uppercase mb-4 block">
          Why Switch
        </span>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
          From Chaos to{" "}
          <TextGradient warm>Complete Control</TextGradient>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          See how FitForge transforms your daily operations overnight.
        </p>
      </motion.div>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-start">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl p-6 sm:p-8"
          style={{
            ...glassStyle,
            borderColor: "hsla(0, 72%, 55%, 0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <X className="w-4 h-4 text-destructive" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              Before FitForge
            </h3>
          </div>
          <div className="space-y-4">
            {befores.map((b, i) => (
              <motion.div
                key={b}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <X className="w-3 h-3 text-destructive" />
                </div>
                <span className="text-sm text-muted-foreground">{b}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl p-6 sm:p-8"
          style={{
            ...glassStyle,
            borderColor: "hsla(165, 70%, 48%, 0.2)",
            ...glowAccent,
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-accent" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              After FitForge
            </h3>
          </div>
          <div className="space-y-4">
            {afters.map((a, i) => (
              <motion.div
                key={a}
                initial={{ opacity: 0, x: 10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-accent" />
                </div>
                <span className="text-sm text-foreground">{a}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mt-10"
      >
        <a
          href="#pricing"
          className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
        >
          See how much you can save <ArrowRight className="w-4 h-4" />
        </a>
      </motion.div>
    </div>
  </section>
);

const benefitsData = [
  {
    icon: Clock,
    title: "Save 10+ Hours/Week",
    description:
      "Automate billing, attendance, and member follow-ups.",
    stat: "10+",
    unit: "hrs/week saved",
  },
  {
    icon: TrendingUp,
    title: "Increase Revenue",
    description:
      "Auto-renewals, payment reminders, and upselling features.",
    stat: "35%",
    unit: "avg revenue increase",
  },
  {
    icon: UserCheck,
    title: "Reduce Member Churn",
    description:
      "Smart engagement, personalized reminders, and workout plans.",
    stat: "91%",
    unit: "member retention",
  },
  {
    icon: Building2,
    title: "Scale Multi-Branch",
    description: "Manage multiple locations from one dashboard.",
    stat: "∞",
    unit: "branches supported",
  },
];

const Benefits = () => (
  <section className="py-20 sm:py-28 border-t border-border/50">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="text-accent text-xs font-semibold tracking-widest uppercase mb-4 block">
          Benefits
        </span>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
          Built for <TextGradient>Real ROI</TextGradient>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          FitForge doesn&apos;t just manage — it grows your business.
        </p>
      </motion.div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {benefitsData.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl p-6 text-center hover:translate-y-[-4px] transition-all duration-300"
            style={glassStyle}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <b.icon className="w-6 h-6 text-primary" />
            </div>
            <p className="font-display text-4xl font-bold mb-0.5">
              <TextGradient>{b.stat}</TextGradient>
            </p>
            <p className="text-xs text-accent mb-4 font-medium">{b.unit}</p>
            <h3 className="font-display font-semibold text-foreground mb-2">
              {b.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {b.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const plans = [
  {
    name: "Starter",
    description: "For small gyms getting started",
    monthlyPrice: 1999,
    yearlyPrice: 1499,
    currency: "₹",
    features: [
      "Up to 200 members",
      "Membership management",
      "Basic billing & payments",
      "Attendance tracking (manual)",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Pro",
    description: "For growing gyms — most popular",
    monthlyPrice: 4999,
    yearlyPrice: 3499,
    currency: "₹",
    features: [
      "Up to 1,000 members",
      "All Starter features",
      "Automated billing & reminders",
      "QR attendance tracking",
      "Trainer & staff management",
      "Reports & analytics",
      "Client engagement tools",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For multi-branch operations",
    monthlyPrice: null,
    yearlyPrice: null,
    currency: "₹",
    features: [
      "Unlimited members",
      "All Pro features",
      "Multi-branch dashboard",
      "Biometric integration",
      "Custom reports & API access",
      "Dedicated account manager",
      "White-label option",
      "SLA guarantee",
    ],
    cta: "Book Demo",
    popular: false,
  },
];

const Pricing = () => {
  const [yearly, setYearly] = useState(true);
  return (
    <section id="pricing" className="py-20 sm:py-28" style={gradientMesh}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-primary text-xs font-semibold tracking-widest uppercase mb-4 block">
            Pricing
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
            Invest in Growth, Not <TextGradient>Overhead</TextGradient>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            FitForge pays for itself. Most gyms recover the cost within the
            first month.
          </p>
          <div
            className="inline-flex items-center gap-1 rounded-xl p-1.5"
            style={glassStyle}
          >
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                !yearly
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                yearly
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly <span className="text-xs opacity-80">(Save 30%)</span>
            </button>
          </div>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="rounded-2xl p-7 relative"
              style={
                plan.popular
                  ? {
                      ...glassElevatedStyle,
                      borderColor: "hsla(250, 75%, 62%, 0.3)",
                      ...glowPrimary,
                    }
                  : glassStyle
              }
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Most Popular
                  </span>
                </div>
              )}
              <h3 className="font-display text-lg font-bold mb-1">{plan.name}</h3>
              <p className="text-xs text-muted-foreground mb-5">
                {plan.description}
              </p>
              <div className="mb-6">
                {plan.monthlyPrice !== null ? (
                  <>
                    <span className="font-display text-4xl font-bold text-foreground">
                      {plan.currency}
                      {(yearly ? plan.yearlyPrice! : plan.monthlyPrice).toLocaleString()}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /month
                    </span>
                  </>
                ) : (
                  <span className="font-display text-3xl font-bold text-foreground">
                    Custom
                  </span>
                )}
              </div>
              <Btn
                className="w-full h-11 font-semibold group"
                variant={plan.popular ? "default" : "outline"}
                style={plan.popular ? glowPrimary : {}}
                href={plan.cta === "Start Free Trial" ? "/signup" : undefined}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Btn>
              <ul className="mt-7 space-y-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const faqs = [
  {
    q: "How long does it take to set up FitForge?",
    a: "Most gyms are fully set up within 24 hours. Our onboarding team helps you import existing member data, configure billing, and train your staff — all included.",
  },
  {
    q: "Can I migrate from my existing software?",
    a: "Absolutely. We support data migration from all major gym management tools. Our team handles the entire process for you at no extra cost.",
  },
  {
    q: "Do you support UPI and Indian payment gateways?",
    a: "Yes! We support UPI, Razorpay, PayTM, credit/debit cards, net banking, and cash payments. Auto-reminders are sent via WhatsApp and SMS.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — every plan comes with a 14-day free trial. No credit card required. You can upgrade, downgrade, or cancel anytime.",
  },
  {
    q: "Can I manage multiple branches?",
    a: "Our Enterprise plan supports unlimited branches with a centralized dashboard. You get unified reporting, cross-branch member access, and centralized billing.",
  },
  {
    q: "What kind of support do you offer?",
    a: "Starter plans include email support. Pro plans get priority chat and phone support. Enterprise customers get a dedicated account manager and SLA guarantees.",
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section id="faq" className="py-20 sm:py-28 border-t border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-primary text-xs font-semibold tracking-widest uppercase mb-4 block">
            FAQ
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
            Got <TextGradient>Questions?</TextGradient>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Everything you need to know before getting started.
          </p>
        </motion.div>
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.q}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full rounded-xl px-6 py-4 flex items-center justify-between text-left group transition-all"
                style={glassStyle}
              >
                <span className="font-medium text-sm text-foreground pr-4">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                    openIndex === i ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>
              <motion.div
                initial={false}
                animate={{
                  height: openIndex === i ? "auto" : 0,
                  opacity: openIndex === i ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTA = () => (
  <section className="py-20 sm:py-28 relative overflow-hidden">
    <div className="absolute inset-0" style={gradientHero} />
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-3xl p-10 sm:p-16 text-center max-w-4xl mx-auto"
        style={{ ...glassElevatedStyle, ...glowPrimary }}
      >
        <Sparkles className="w-10 h-10 text-primary mx-auto mb-6" />
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
          Stop Managing Manually.{" "}
          <TextGradient>Start Scaling.</TextGradient>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
          Join 1,000+ gym owners who automated their business and grew revenue
          with FitForge. Your first 14 days are completely free.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Btn
            size="lg"
            className="text-base font-semibold group"
            style={glowPrimary}
            href="/signup"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
          </Btn>
          <Btn
            size="lg"
            variant="outline"
            className="text-base font-semibold border-border hover:border-primary/50 group"
          >
            <Play className="w-4 h-4 mr-2 text-primary" />
            Book Demo
          </Btn>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          No credit card required · Setup in under 24 hours · Cancel anytime
        </p>
      </motion.div>
    </div>
  </section>
);

const footerLinks: Record<string, string[]> = {
  Product: ["Features", "Pricing", "Integrations", "API Docs", "Changelog"],
  Company: ["About Us", "Careers", "Blog", "Press Kit"],
  Support: ["Help Center", "Contact Us", "Status Page", "Community"],
  Legal: [
    "Privacy Policy",
    "Terms of Service",
    "Data Processing",
    "Security",
  ],
};

const Footer = () => (
  <footer className="border-t border-border/50 pt-16 pb-8">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              FitForge
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
            The all-in-one gym business operating system. Manage memberships,
            automate payments, and grow revenue — effortlessly.
          </p>
          <div className="flex gap-3">
            {["Twitter", "LinkedIn", "Instagram", "YouTube"].map((s) => (
              <a
                key={s}
                href="#"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <span className="text-xs font-semibold">{s[0]}</span>
              </a>
            ))}
          </div>
        </div>
        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <h4 className="font-display text-sm font-semibold text-foreground mb-4">
              {title}
            </h4>
            <ul className="space-y-2.5">
              {links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          © 2026 FitForge Business OS. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground">
          Made with ❤️ for gym owners worldwide
        </p>
      </div>
    </div>
  </footer>
);

const liveActivities = [
  { gym: "Iron Fitness", city: "Chennai" },
  { gym: "FlexStudio", city: "Mumbai" },
  { gym: "PowerHouse Gym", city: "Bangalore" },
  { gym: "FitZone Pro", city: "Delhi" },
  { gym: "Muscle Factory", city: "Hyderabad" },
  { gym: "The Grind", city: "Pune" },
];

const LiveActivity = () => {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % liveActivities.length);
        setVisible(true);
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, [dismissed]);
  if (dismissed) return null;
  const activity = liveActivities[current];
  return (
    <div className="fixed bottom-6 left-6 z-40">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl max-w-xs"
            style={glassElevatedStyle}
          >
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-accent" />
              <div className="w-2.5 h-2.5 rounded-full bg-accent absolute inset-0 animate-live-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {activity.gym} just signed up
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {activity.city}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StickyCtaBar = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 py-3 px-4 md:hidden"
          style={glassStyle}
        >
          <Btn
            className="w-full h-12 font-semibold group"
            style={glowPrimary}
            href="/signup"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Btn>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function FitForgeLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <ProductDemo />
      <ProblemSolution />
      <Benefits />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
      <LiveActivity />
      <StickyCtaBar />
    </div>
  );
}
