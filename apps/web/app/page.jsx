"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay } },
});

export default function HomePage() {
  return (
    <div className="space-y-24">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
        <div className="absolute -left-20 -top-20 size-[400px] rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="absolute -right-16 -bottom-24 size-[420px] rounded-full bg-brand-accent/10 blur-3xl" />

        <div className="relative px-6 sm:px-10 py-16 md:py-24">
          <motion.h1
            {...fade(0)}
            className="text-4xl md:text-6xl font-extrabold leading-tight"
          >
            Train Smarter with{" "}
            <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
              AI-Powered Form Coaching
            </span>
          </motion.h1>

          <motion.p
            {...fade(0.2)}
            className="mt-5 max-w-2xl text-lg text-brand-muted"
          >
            FormFit uses real-time computer vision to analyze your posture,
            count reps, and give instant feedback—so every workout moves you closer to your goals.
          </motion.p>

          <motion.div {...fade(0.35)} className="mt-8 flex gap-4">
            <Button as={Link} href="/register" size="lg">Get Started</Button>
            <Button as={Link} href="/login" size="lg" variant="secondary">Login</Button>
          </motion.div>

          {/* Subtle “device/mock” banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-14 grid gap-6 md:grid-cols-2"
          >
            <Card title="AI Form Feedback" subtitle="Powered by pose detection">
              <p className="text-brand-muted">
                Live skeletal overlay, posture checks, and rep validation—no wearables needed.
              </p>
            </Card>
            <Card title="Progress Insights" subtitle="Charts & trends">
              <p className="text-brand-muted">
                Weekly reps, calories, accuracy, and workout heatmaps to keep you consistent.
              </p>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="grid md:grid-cols-2 gap-10 items-start">
        <motion.div {...fade(0)}>
          <h2 className="text-3xl font-semibold mb-4">What is FormFit?</h2>
          <p className="text-brand-muted">
            A full-stack AI fitness platform. Frontend in Next.js + Tailwind; backend in Node/Express
            with MongoDB and Socket.IO for real-time coaching. Designed for speed, accuracy, and simplicity.
          </p>
          <ul className="mt-6 space-y-2 text-brand-muted">
            <li>• MediaPipe/TensorFlow-based pose estimation</li>
            <li>• Real-time feedback via WebSockets</li>
            <li>• Secure JWT auth, profile, and stats</li>
            <li>• Dashboard analytics and workout history</li>
          </ul>
        </motion.div>

        <motion.div {...fade(0.15)}>
          <div className="card-glass p-6">
            <h3 className="text-lg font-semibold mb-2">Under the Hood</h3>
            <p className="text-brand-muted">
              APIs: <span className="text-brand-text">/auth</span>, <span className="text-brand-text">/users</span>, <span className="text-brand-text">/workouts</span>.<br />
              Events: <span className="text-brand-text">session:start</span>, <span className="text-brand-text">pose:update</span>, <span className="text-brand-text">session:end</span>.
            </p>
          </div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section>
        <h2 className="text-3xl font-semibold mb-10 text-center">Core Features</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: "✅", title: "Real-time Form Correction", desc: "Green = good, orange = fix, red = invalid." },
            { icon: "📊", title: "Smart Analytics", desc: "Charts for accuracy, calories, and frequency." },
            { icon: "🏋️", title: "Workout Sessions", desc: "Build sets, start timers, auto rep counts." },
            { icon: "🎯", title: "Personalization", desc: "Goals, BMI, and tailored session plans." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="card-glass p-6 hover:shadow-glow transition"
            >
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-brand-muted">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-10">
        <h2 className="text-2xl font-semibold">Ready to transform your training?</h2>
        <div className="mt-6">
          <Button as={Link} href="/register" size="lg">Start Now</Button>
        </div>
      </section>
    </div>
  );
}
