"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

const PRESETS = [
  { label: "SD 480p", width: 640, height: 480 },
  { label: "HD 720p", width: 1280, height: 720 },
  { label: "Full HD 1080p", width: 1920, height: 1080 },
];

export default function CalibratePage() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [preset, setPreset] = useState(PRESETS[1]);
  const [mirror, setMirror] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Load existing calibration
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("calibration") : null;
      if (raw) {
        const c = JSON.parse(raw);
        if (c.deviceId) setDeviceId(c.deviceId);
        if (c.width && c.height) setPreset({ label: `${c.width}x${c.height}`, width: c.width, height: c.height });
        if (typeof c.mirror === "boolean") setMirror(c.mirror);
      }
    } catch {}
  }, []);

  // Enumerate cameras
  useEffect(() => {
    async function enumerate() {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        const cams = all.filter((d) => d.kind === "videoinput");
        setDevices(cams);
        if (!deviceId && cams[0]) setDeviceId(cams[0].deviceId);
      } catch (e) {
        setError("Could not access media devices. Check permissions.");
      }
    }
    enumerate();
  }, [deviceId]);

  // Start camera when selection changes
  useEffect(() => {
    async function start() {
      if (!deviceId) return;
      setError("");
      setSaved(false);
      try {
        // Stop any prior stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        const constraints = {
          video: {
            deviceId: { ideal: deviceId },
            width: { ideal: preset.width },
            height: { ideal: preset.height },
            facingMode: "user",
          },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        console.error(e);
        setError("Failed to start camera. Try a different device or preset.");
      }
    }
    start();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [deviceId, preset]);

  const onSave = () => {
    try {
      const payload = { deviceId, width: preset.width, height: preset.height, mirror };
      localStorage.setItem("calibration", JSON.stringify(payload));
      setSaved(true);
    } catch (e) {
      setError("Could not save calibration.");
    }
  };

  const videoStyle = useMemo(
    () => ({ transform: mirror ? "scaleX(-1)" : "none" }),
    [mirror]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Camera Calibration</h1>
      <p className="text-sm text-brand-muted">
        Choose your camera, resolution, and alignment. Save to apply settings in workouts.
      </p>

      {error && <Alert>{error}</Alert>}
      {saved && <Alert kind="success">Calibration saved.</Alert>}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Preview">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" style={videoStyle} />
            {/* Overlay guides */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-6 rounded-2xl border border-white/20" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/10" />
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-white/10" />
            </div>
          </div>
        </Card>

        <Card title="Settings">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Camera</label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(-4)}`}
                  </option>
                ))}
                {!devices.length && <option>— No cameras found —</option>}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Resolution</label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    variant={preset.label === p.label ? undefined : "secondary"}
                    onClick={() => setPreset(p)}
                    size="sm"
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Mirror preview</span>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} />
                <span>{mirror ? "On" : "Off"}</span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => window.location.reload()}>Reset</Button>
              <Button onClick={onSave}>Save calibration</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

