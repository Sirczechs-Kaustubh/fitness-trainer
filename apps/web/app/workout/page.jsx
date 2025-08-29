"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Play, Square, Camera, Sparkles, Activity, Volume2, VolumeX } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { getSocket, disconnectSocket } from "@/lib/socket";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, delay: d } },
});

const EXERCISES = [
  "Squat", "Push-Up", "Lunge", "Plank", "Bicep Curl", "Shoulder Press", "Deadlift", "Mountain Climbers"
];

export default function WorkoutPage() {
  const { user, ready, logout } = useAuth({ requireAuth: false });
  const [running, setRunning] = useState(false);
  const [muted, setMuted] = useState(true);
  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [reps, setReps] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("Stand centered. Ensure good lighting.");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const startedAtRef = useRef(null);
  const lastPoseRef = useRef(null); // when model added

  // timer
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // cleanup on unmount
  useEffect(() => () => stopEverything(), []);

  if (!ready) return null;

  async function startSession() {
    setError("");
    try {
      // 1) Camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      // 2) Size canvas to video
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      // 3) Socket
      const socket = getSocket();
      socket.off("rep:update");
      socket.off("score:update");
      socket.off("feedback:new");
      socket.on("rep:update", (n) => setReps(n));
      socket.on("score:update", (s) => setScore(s));
      socket.on("feedback:new", (msg) => setFeedback(msg));

      socket.emit("session:start", {
        userId: user?._id,
        exercise,
        ts: Date.now()
      });

      // 4) Start draw loop (and later: model inference here)
      startedAtRef.current = Date.now();
      setSeconds(0);
      setRunning(true);
      drawLoop(); // kick it off
    } catch (e) {
      console.error(e);
      setError("Could not access camera. Check permissions.");
    }
  }

  function endSession() {
    // Send last stats to server
    try {
      const socket = getSocket();
      socket.emit("session:end", {
        userId: user?._id,
        exercise,
        reps,
        score,
        durationSec: Math.round((Date.now() - (startedAtRef.current || Date.now())) / 1000)
      });
    } catch {}
    stopEverything();
  }

  function stopEverything() {
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // don't fully disconnect socket; keep it for app lifetime
  }

  // This will run each frame: draw video and overlay
  function drawLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    // 1) Draw the current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2) Draw overlay - grid + bounding “training” region
    drawOverlay(ctx, canvas);

    // 3) If you had model results, draw them:
    // const pose = lastPoseRef.current; drawPose(ctx, pose);

    // 4) Placeholder: emit a dummy pose heartbeat every ~10 frames
    // Replace this with real MediaPipe/MoveNet keypoints later.
    if (Math.random() < 0.08) {
      emitPoseUpdate({ ts: Date.now(), exercise });
    }

    if (running) {
      rafRef.current = requestAnimationFrame(drawLoop);
    }
  }

  function emitPoseUpdate(pose) {
    try {
      const socket = getSocket();
      socket.emit("pose:update", {
        userId: user?._id,
        exercise,
        pose
      });
    } catch {}
  }

  function drawOverlay(ctx, canvas) {
    const w = canvas.width, h = canvas.height;

    // subtle vignette
    const grad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)/4, w/2, h/2, Math.max(w,h)/1.1);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,w,h);

    // training region (center box)
    const boxW = Math.floor(w * 0.6);
    const boxH = Math.floor(h * 0.7);
    const x = Math.floor((w - boxW) / 2);
    const y = Math.floor((h - boxH) / 2);
    ctx.strokeStyle = "rgba(59,130,246,0.8)"; // blue
    ctx.lineWidth = 3;
    roundedRect(ctx, x, y, boxW, boxH, 16);
    ctx.stroke();

    // corner accents
    ctx.strokeStyle = "rgba(34,197,94,0.9)"; // green
    ctx.lineWidth = 5;
    const L = 26;
    // tl
    ctx.beginPath(); ctx.moveTo(x, y+L); ctx.lineTo(x, y); ctx.lineTo(x+L, y); ctx.stroke();
    // tr
    ctx.beginPath(); ctx.moveTo(x+boxW-L, y); ctx.lineTo(x+boxW, y); ctx.lineTo(x+boxW, y+L); ctx.stroke();
    // bl
    ctx.beginPath(); ctx.moveTo(x, y+boxH-L); ctx.lineTo(x, y+boxH); ctx.lineTo(x+L, y+boxH); ctx.stroke();
    // br
    ctx.beginPath(); ctx.moveTo(x+boxW-L, y+boxH); ctx.lineTo(x+boxW, y+boxH); ctx.lineTo(x+boxW, y+boxH-L); ctx.stroke();

    // session HUD
    const pad = 10;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(pad, pad, 210, 84);
    ctx.fillStyle = "#E5E7EB";
    ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI";
    ctx.fillText(`Exercise: ${exercise}`, pad+10, pad+24);
    ctx.fillText(`Reps: ${reps}   Score: ${score}`, pad+10, pad+42);
    ctx.fillText(`Time: ${formatTime(seconds)}`, pad+10, pad+60);
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }

  function formatTime(s) {
    const m = Math.floor(s / 60), ss = s % 60;
    return `${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workout Session</h1>
          <p className="text-sm text-brand-muted">Real-time coaching with computer vision.</p>
        </div>
        <Button variant="secondary" onClick={logout}>Logout</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Camera panel */}
        <motion.div {...fade(0)} className="lg:col-span-2">
          <Card title="Live Camera" subtitle={feedback} className="p-3 md:p-4">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
              {/* Video under the canvas (hidden—canvas shows the frame + overlay) */}
              <video ref={videoRef} playsInline muted className="hidden" />

              {/* Canvas draws the video frame + overlay */}
              <canvas ref={canvasRef} className="w-full h-auto block" />

              {/* Top-right HUD buttons */}
              <div className="absolute top-3 right-3 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMuted((m) => !m)}
                  title={muted ? "Unmute cues" : "Mute cues"}
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => alert("Calibration coming soon!")}>
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              {/* Center watermark */}
              {!running && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex items-center gap-2 text-brand-muted">
                    <Sparkles className="h-5 w-5" />
                    <span>Click Start to begin</span>
                  </div>
                </div>
              )}
            </div>
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          </Card>
        </motion.div>

        {/* Controls / session info */}
        <motion.div {...fade(0.05)} className="lg:col-span-1">
          <Card title="Controls" subtitle="Choose exercise and manage session" className="p-6 space-y-4">
            {/* Exercise picker */}
            <label className="text-sm font-medium">Exercise</label>
            <select
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              disabled={running}
            >
              {EXERCISES.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>

            {/* Session metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card-glass p-3 text-center">
                <p className="text-xs text-brand-muted">Time</p>
                <p className="text-lg font-semibold">{formatTime(seconds)}</p>
              </div>
              <div className="card-glass p-3 text-center">
                <p className="text-xs text-brand-muted">Reps</p>
                <p className="text-lg font-semibold">{reps}</p>
              </div>
              <div className="card-glass p-3 text-center">
                <p className="text-xs text-brand-muted">Score</p>
                <p className="text-lg font-semibold">{score}</p>
              </div>
            </div>

            {/* Start/End */}
            <div className="flex gap-3 pt-2">
              {!running ? (
                <Button onClick={startSession} className="flex-1">
                  <Play className="mr-2 h-4 w-4" /> Start
                </Button>
              ) : (
                <Button variant="danger" onClick={endSession} className="flex-1">
                  <Square className="mr-2 h-4 w-4" /> End
                </Button>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-emerald-400" />
                Stand ~2–3m from camera, full body visible, good lighting.
              </div>
            </div>
          </Card>

          <div className="mt-4">
            <Card title="How it works" className="p-4">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-brand-muted">
                <li>Click <span className="text-brand-text font-medium">Start</span> to enable your camera.</li>
                <li>We’ll run a pose model on-device (coming next) and emit <code className="text-brand-text">pose:update</code> to the server.</li>
                <li>Server validates reps & sends <code className="text-brand-text">feedback</code> and <code className="text-brand-text">score</code>.</li>
              </ol>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
