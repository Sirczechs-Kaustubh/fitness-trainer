"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Play, Square, Camera, Sparkles, Activity, Volume2, VolumeX } from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { getSocket, disconnectSocket } from "@/lib/socket";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/apiClient";
// MediaPipe Tasks Vision will be dynamically imported when starting session

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, delay: d } },
});

const EXERCISES = [
  "Squat",
  "Lunge",
  "Push-up",
  "Bicep Curl",
  "Shoulder Press",
  "Jumping Jack",
  "Tricep Dip",
  "Mountain Climber",
];

export default function WorkoutPage() {
  const { user, ready } = useAuth({ requireAuth: false });
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [muted, setMuted] = useState(true);
  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [reps, setReps] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("Stand centered. Ensure good lighting.");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [workoutId, setWorkoutId] = useState(null);
  const [mirror, setMirror] = useState(true);
  const [calib, setCalib] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const vfcRef = useRef(null); // requestVideoFrameCallback id
  const streamRef = useRef(null);
  const startedAtRef = useRef(null);
  const lastPoseRef = useRef(null); // when model added
  const landmarkerRef = useRef(null);
  const visionRef = useRef(null);
  const creatingLandmarkerRef = useRef(null); // guard against double-creation in Strict Mode
  const lastVideoTimeRef = useRef(-1);
  const [loadingModel, setLoadingModel] = useState(false);
  const [debug] = useState(process.env.NODE_ENV !== "production");
  const [fps, setFps] = useState(0);
  const framesSinceRef = useRef(0);
  const lastFpsAtRef = useRef(0);
  const firstDetectLoggedRef = useRef(false);
  const firstTickLoggedRef = useRef(false);
  const [example, setExample] = useState({ loading: false, url: null, name: null, source: null });
  const [exercisesList, setExercisesList] = useState([]);
  const selectedExercise = useMemo(() => exercisesList.find((x) => x.name === exercise) || null, [exercisesList, exercise]);

  // timer
  useEffect(() => {
    runningRef.current = running;
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Load saved calibration on mount
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("calibration") : null;
      if (raw) {
        const c = JSON.parse(raw);
        setCalib(c);
        if (typeof c.mirror === "boolean") setMirror(c.mirror);
      }
    } catch {}
  }, []);

  // cleanup on unmount
  useEffect(() => () => stopEverything(), []);

  // Fetch exercises from API; fallback to static list if unavailable
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get("/exercises", { params: { limit: 100 } });
        const items = Array.isArray(data?.data) ? data.data : [];
        if (!active) return;
        setExercisesList(items);
        if (items.length && !items.find((e) => e.name === exercise)) {
          setExercise(items[0].name);
        }
      } catch (e) {
        if (!active) return;
        setExercisesList([]);
      }
    })();
    return () => { active = false; };
  }, []);

  // Fetch example video for current exercise
  useEffect(() => {
    let active = true;
    (async () => {
      if (!ready || !exercise) return;
      try {
        setExample((e) => ({ ...e, loading: true }));
        const { data } = await api.get(`/exercises/example`, { params: { name: exercise } });
        if (!active) return;
        setExample({ loading: false, url: data?.videoUrl || null, name: data?.name || exercise, source: data?.source || null });
      } catch (e) {
        if (!active) return;
        setExample({ loading: false, url: null, name: exercise, source: null });
      }
    })();
    return () => { active = false; };
  }, [exercise, ready]);

  // Optional: warm up the pose model to reduce start delay
  useEffect(() => {
    (async () => {
      try {
        setLoadingModel(true);
        await ensurePoseLandmarker();
      } catch (e) {
        // ignore prefetch errors; will retry on start
      } finally {
        setLoadingModel(false);
      }
    })();
  }, []);

  if (!ready) return null;

  async function startSession() {
    setError("");
    try {
      // 1) Call the API to create the workout session in the database
      // Tell backend what we plan to do so history has a name
      const { data } = await api.post("/workouts/start", {
        plannedExercises: [exercise],
      });

      const newWorkoutId = data.workoutId;
      if (!newWorkoutId) {
        throw new Error("API did not return a workout ID.");
      }
      setWorkoutId(newWorkoutId);

      // 2) Get camera access with constraints from calibration if available
      const c = calib || {};
      const constraints = {
        video: {
          deviceId: c.deviceId ? { ideal: c.deviceId } : undefined,
          facingMode: "user",
          width: c.width ? { ideal: c.width } : { ideal: 1280 },
          height: c.height ? { ideal: c.height } : { ideal: 720 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // Fallback to default if constraints fail
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      }
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;

      // Wait until we have data to render
      if (video.readyState >= 2) {
        // HAVE_CURRENT_DATA
      } else {
        await new Promise((resolve) => {
          const onCanPlay = () => {
            video.removeEventListener("canplay", onCanPlay);
            resolve();
          };
          video.addEventListener("canplay", onCanPlay, { once: true });
        });
      }

      await video.play();

      // 3) Initialize canvas size to match displayed size
      const canvas = canvasRef.current;
      const cw = canvas.clientWidth || 1280;
      const ch = canvas.clientHeight || Math.round((cw * 9) / 16);
      canvas.width = cw;
      canvas.height = ch;
      if (debug) {
        console.info("camera ready", {
          hasVFC: typeof video.requestVideoFrameCallback === "function",
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
        });
      }

      // 4) Socket setup
      const socket = getSocket();
      socket.off("feedback:new");
      socket.off("session:ready");
      socket.off("error");
      socket.on("feedback:new", (payload) => {
        if (debug) console.debug("socket feedback:new", payload);
        if (typeof payload?.repCount === "number") setReps(payload.repCount);
        if (payload?.feedback) setFeedback(payload.feedback);
        if (typeof payload?.score === "number") setScore(payload.score);
      });
      socket.on("session:ready", () => {
        if (debug) console.debug("socket session:ready");
        setFeedback("Session ready. Begin your movement.");
      });
      socket.on("error", (e) => {
        console.error("Socket error", e);
        setError(e?.message || "Real-time analysis error");
      });

      // Signal backend which exercise we are doing
      if (debug) console.debug("socket emit session:start", { exercise, userId: user?._id });
      socket.emit("session:start", { exercise, userId: user?._id });

      // 5) Load MediaPipe Pose landmarker if not already
      await ensurePoseLandmarker();
      if (debug) console.info("pose landmarker ready");

      // 6) Start draw loop (prefer requestVideoFrameCallback when available)
      startedAtRef.current = Date.now();
      setSeconds(0);
      setRunning(true);
      startDrawing();
      if (debug) console.info("drawing loop started");
    } catch (e) {
      console.error(e);
      setError(e.message || "Could not start session. Check camera permissions.");
      stopEverything();
    }
  }
  
  async function endSession() { // 👈 Make the function async
    if (!workoutId) return; // Don't do anything if there's no active workout

    try {
      const durationSec = Math.round((Date.now() - (startedAtRef.current || Date.now())) / 1000);
      
      // Call the API to finalize the workout with a summarized exercise log
      await api.post(`/workouts/${workoutId}/end`, {
        exercises: [
          {
            name: exercise,
            reps,
            sets: 1,
            formScore: score,
          },
        ],
      });

      // We no longer need this, as the REST API call handles the end
      // const socket = getSocket();
      // socket.emit("session:end", { ... });

    } catch (err) {
      console.error("Failed to end session:", err);
      // Optionally, set an error message for the user
    } finally {
      stopEverything();
      setWorkoutId(null); // Clean up the workout ID
    }
  }

  function stopEverything() {
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (vfcRef.current && videoRef.current && videoRef.current.cancelVideoFrameCallback) {
      try { videoRef.current.cancelVideoFrameCallback(vfcRef.current); } catch {}
    }
    // Close landmarker to free WebGL/wasm resources
    if (landmarkerRef.current && landmarkerRef.current.close) {
      try { landmarkerRef.current.close(); } catch {}
    }
    landmarkerRef.current = null;
    lastPoseRef.current = null;
    lastVideoTimeRef.current = -1;
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

  function startDrawing() {
    const video = videoRef.current;
    if (!video) return;
    const hasVFC = typeof video.requestVideoFrameCallback === "function";
    if (hasVFC) {
      const tick = (now /* DOMHighResTimeStamp */, metadata) => {
        // Always reschedule next frame to avoid race with setState
        vfcRef.current = video.requestVideoFrameCallback(tick);
        if (!runningRef.current) return;
        if (debug && !firstTickLoggedRef.current) {
          firstTickLoggedRef.current = true;
          console.info("VFC tick firing");
        }
        // Prefer mediaTime from VFC metadata for pose timestamp
        const ts = metadata && typeof metadata.mediaTime === 'number' ? metadata.mediaTime * 1000 : now;
        drawFrame(ts);
      };
      vfcRef.current = video.requestVideoFrameCallback(tick);
    } else {
      const tick = (now) => {
        rafRef.current = requestAnimationFrame(tick);
        if (!runningRef.current) return;
        if (debug && !firstTickLoggedRef.current) {
          firstTickLoggedRef.current = true;
          console.info("RAF tick firing");
        }
        drawFrame(now || performance.now());
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  // Draw only the overlay; video is rendered directly underneath
  function drawFrame(nowInMs) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    // Keep canvas resolution in sync with displayed size
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw && ch && (canvas.width !== cw || canvas.height !== ch)) {
      canvas.width = cw;
      canvas.height = ch;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Run pose detection for current frame and emit landmarks
    tryDetectAndEmit(video, nowInMs);

    // 2) Draw overlay - grid + bounding “training” region
    drawOverlay(ctx, canvas);

    // 3) If you had model results, draw them:
    const pose = lastPoseRef.current; drawPose(ctx, pose, canvas);

    // 4) Placeholder: emit a dummy pose heartbeat every ~10 frames
    // Replace this with real MediaPipe/MoveNet keypoints later.
    // (Removed; now streaming real landmarks)
    // FPS meter (debug)
    if (debug) {
      const now = performance.now();
      if (!lastFpsAtRef.current) lastFpsAtRef.current = now;
      framesSinceRef.current += 1;
      if (now - lastFpsAtRef.current >= 1000) {
        setFps(framesSinceRef.current);
        framesSinceRef.current = 0;
        lastFpsAtRef.current = now;
      }
    }
  }

  function emitPoseUpdate(poseLandmarks) {
    try {
      const socket = getSocket();
      socket.emit("pose:update", { userId: user?._id, exercise, poseLandmarks });
    } catch {}
  }

  async function ensurePoseLandmarker() {
    if (landmarkerRef.current) return;
    if (creatingLandmarkerRef.current) {
      // If another call is already creating the landmarker, await it
      await creatingLandmarkerRef.current;
      return;
    }

    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    // Load wasm files from CDN; model from CDN as well
    const wasmLoaderPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm";
    const modelAssetPath = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task";

    const create = async () => {
      // Initialize resolver once
      if (!visionRef.current) {
        visionRef.current = await FilesetResolver.forVisionTasks(wasmLoaderPath);
      }
      try {
        landmarkerRef.current = await PoseLandmarker.createFromOptions(visionRef.current, {
          baseOptions: { modelAssetPath, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.35,
          minPoseTrackingConfidence: 0.35,
          minPosePresenceConfidence: 0.35,
        });
      } catch (e) {
        // Fallback to CPU if GPU delegate fails
        landmarkerRef.current = await PoseLandmarker.createFromOptions(visionRef.current, {
          baseOptions: { modelAssetPath, delegate: "CPU" },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.35,
          minPoseTrackingConfidence: 0.35,
          minPosePresenceConfidence: 0.35,
        });
      }
    };

    creatingLandmarkerRef.current = create();
    try {
      await creatingLandmarkerRef.current;
    } finally {
      creatingLandmarkerRef.current = null;
    }
  }

  function tryDetectAndEmit(video, nowInMs) {
    const landmarker = landmarkerRef.current;
    if (!landmarker) return;
    // Ensure the video element is fully ready
    if (!video.videoWidth || !video.videoHeight) return;
    // Detect using given timestamp, avoiding duplicate detection on same mediaTime when available
    const t = video.currentTime;
    if (t === lastVideoTimeRef.current) {
      // still run detect to keep results fresh, but note that mediaTime hasn't advanced
    } else {
      lastVideoTimeRef.current = t;
    }
    // Use a monotonic timestamp; tasks-vision expects an increasing ms clock
    const timestampMs = typeof nowInMs === "number" ? nowInMs : performance.now();
    let res;
    try {
      res = landmarker.detectForVideo(video, timestampMs);
    } catch (err) {
      console.error("detectForVideo error", err);
      return;
    }
    const arr = (res && (res.landmarks || res.poseLandmarks)) || [];
    if (arr && arr.length > 0) {
      const lm = arr[0];
      lastPoseRef.current = lm;
      emitPoseUpdate(lm);
      if (debug && !firstDetectLoggedRef.current) {
        firstDetectLoggedRef.current = true;
        try {
          // Log first detection sample for quick sanity check
          // Expect 33 keypoints, show a couple
          // eslint-disable-next-line no-console
          console.info("Pose detected:", { count: lm?.length, sample: lm?.slice(0, 2) });
        } catch {}
      }
    }
  }

  function drawPose(ctx, landmarks, canvas) {
    if (!landmarks || !landmarks.length) return;
    const w = canvas.width, h = canvas.height;
    // Account for object-cover scaling of the underlying video
    const video = videoRef.current;
    const vw = video?.videoWidth || w;
    const vh = video?.videoHeight || h;
    const scale = Math.max(w / vw, h / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const ox = (w - dw) / 2;
    const oy = (h - dh) / 2;
    ctx.save();
    // draw connections (simple)
    const C = [
      [11, 13],[13, 15], // left arm
      [12, 14],[14, 16], // right arm
      [11, 12],          // shoulders
      [23, 24],          // hips
      [11, 23],[12, 24], // torso
      [23, 25],[25, 27], // left leg
      [24, 26],[26, 28], // right leg
    ];
    ctx.strokeStyle = "rgba(59,130,246,0.9)"; // blue
    ctx.lineWidth = 2;
    for (const [a,b] of C) {
      const pa = landmarks[a];
      const pb = landmarks[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(ox + pa.x * dw, oy + pa.y * dh);
      ctx.lineTo(ox + pb.x * dw, oy + pb.y * dh);
      ctx.stroke();
    }
    // draw keypoints
    ctx.fillStyle = "rgba(16,185,129,0.95)"; // emerald
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(ox + p.x * dw, oy + p.y * dh, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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
        {/* Logout is available in the global NavBar */}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Camera panel */}
        <motion.div {...fade(0)} className="lg:col-span-2">
          <Card title="Live Camera" subtitle={feedback} className="p-3 md:p-4">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
              {/* Visible video background; canvas overlays for guides/HUD */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: mirror ? "scaleX(-1)" : "none" }}
              />

              {/* Canvas draws only overlay; mirrors with video */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full block pointer-events-none"
                style={{ transform: mirror ? "scaleX(-1)" : "none" }}
              />

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
                <Button as="a" href="/calibrate" variant="secondary" size="sm" title="Open AI plan">
                  <Sparkles className="h-4 w-4" />
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

          {/* Debug HUD */}
          {debug && (
            <div className="absolute bottom-3 right-3 text-xs bg-black/60 rounded-md px-2 py-1 text-emerald-200">
              <span>FPS: {fps}</span>
              {lastPoseRef.current ? <span className="ml-2">LM: ✓</span> : <span className="ml-2">LM: …</span>}
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
              {(exercisesList.length ? exercisesList.map((x) => x.name) : EXERCISES).map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>

            {selectedExercise && (
              <div className="mt-2 text-xs text-brand-muted">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                    <span className="opacity-70">Difficulty:</span>
                    <span className="ml-1 text-brand-text">{selectedExercise.difficulty || "—"}</span>
                  </span>
                  {Array.isArray(selectedExercise.musclesTargeted) && selectedExercise.musclesTargeted.slice(0,2).map((m) => (
                    <span key={m} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-brand-text">{m}</span>
                  ))}
                  {Array.isArray(selectedExercise.musclesTargeted) && selectedExercise.musclesTargeted.length > 2 && (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5">+{selectedExercise.musclesTargeted.length - 2} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Inline example video for current exercise */}
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-brand-muted mb-2">Example: <span className="text-brand-text">{example.name || exercise}</span></p>
              {example.loading ? (
                <p className="text-xs text-brand-muted">Loading example…</p>
              ) : example.url ? (
                <div>
                  {renderEmbeddedVideo(example.url)}
                  {example.source && <p className="mt-2 text-[11px] text-brand-muted">Source: {example.source}</p>}
                </div>
              ) : (
                <p className="text-xs text-brand-muted">No example found. Check Tutorials.</p>
              )}
            </div>

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

function toYouTubeEmbed(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      // handle shorts or embed forms
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'shorts' && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
    }
    return url;
  } catch {
    return url;
  }
}

function toVimeoEmbed(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('vimeo.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      const id = parts.find((p) => /^\d+$/.test(p));
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}

function isDirectVideo(url) {
  return /(\.mp4|\.webm|\.ogg)(\?.*)?$/i.test(url);
}

function renderEmbeddedVideo(url) {
  if (/youtube\.com|youtu\.be/.test(url)) {
    const src = toYouTubeEmbed(url);
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10">
        <iframe
          src={src}
          title="Exercise Example"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  const vimeo = toVimeoEmbed(url);
  if (vimeo) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10">
        <iframe
          src={vimeo}
          title="Exercise Example"
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (isDirectVideo(url)) {
    return (
      <video src={url} controls className="w-full rounded-2xl border border-white/10" preload="metadata" />
    );
  }
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10">
      <iframe
        src={url}
        title="Exercise Example"
        className="w-full h-full"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
