"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";

const MAX_SECONDS = 120; // auto-stop & kirim saat tercapai
const MAX_BYTES = 25 * 1024 * 1024; // limit Groq Whisper — validasi sebelum kirim

type RecState = "idle" | "recording" | "transcribing";

// MediaRecorder mendukung webm/ogg/mp4 tergantung browser; Groq menerima webm & ogg.
function pickMime() {
  for (const t of ["audio/webm", "audio/ogg", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function MicButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [state, setState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const busyRef = useRef(false); // kunci transisi start/stop — cegah klik-cepat berturut

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }
  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  // Cleanup mutlak saat unmount: matikan mic & timer supaya indikator "mic aktif"
  // tak nyantol di tab browser.
  useEffect(() => {
    return () => {
      clearTimer();
      const r = recorderRef.current;
      if (r && r.state !== "inactive") r.stop();
      stopTracks();
    };
  }, []);

  async function transcribe(blob: Blob) {
    if (blob.size === 0) return setState("idle"); // hening / tak ada data
    if (blob.size > MAX_BYTES) {
      toast.error("rekamannya kepanjangan buat diproses — coba lebih singkat ya");
      return setState("idle");
    }
    setState("transcribing");
    try {
      const body = new FormData();
      body.append("audio", blob, "rekaman.webm");
      const res = await fetch("/api/stt", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "fitur suara lagi bermasalah, coba ketik manual dulu ya");
      } else if (typeof data.text === "string" && data.text.trim()) {
        onTranscript(data.text.trim());
      } else {
        toast.error("nggak ada suara yang kedengeran — coba lagi lebih dekat ke mic ya");
      }
    } catch {
      toast.error("koneksinya lagi bermasalah, coba lagi atau ketik manual dulu ya");
    } finally {
      setState("idle");
    }
  }

  function stop() {
    clearTimer();
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop(); // → onstop → transcribe
  }

  async function start() {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        transcribe(blob);
      };
      recorderRef.current = rec;
      rec.start();
      startRef.current = Date.now();
      setElapsed(0);
      setState("recording");
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startRef.current) / 1000);
        setElapsed(secs);
        if (secs >= MAX_SECONDS) stop(); // batas durasi → auto-stop & kirim
      }, 250);
    } catch (err) {
      stopTracks();
      setState("idle");
      const denied =
        err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      toast.error(
        denied
          ? "izin mic ditolak. aktifkan lewat ikon gembok di address bar browser, lalu coba lagi ya."
          : "nggak nemu mic-nya. cek perangkat atau ketik manual dulu ya."
      );
    } finally {
      busyRef.current = false;
    }
  }

  function toggle() {
    if (state === "transcribing") return; // sedang proses — abaikan klik
    if (state === "recording") stop();
    else start();
  }

  const recording = state === "recording";

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={state === "transcribing"}
        aria-label={recording ? "Hentikan rekaman" : "Rekam suara"}
        aria-pressed={recording}
        className={`flex size-12 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
          recording
            ? "bg-primary text-ink shadow-[0_3px_14px_rgba(63,168,139,0.35)]"
            : "text-primary-ink hover:bg-primary-soft"
        }`}
      >
        {state === "transcribing" ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : recording ? (
          <Square className="size-4 fill-current" strokeWidth={2} aria-hidden />
        ) : (
          <Mic className="size-5" strokeWidth={2} aria-hidden />
        )}
      </button>
      {recording && (
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary-ink"
          aria-live="polite"
        >
          <span className="size-2 rounded-full bg-primary-deep motion-safe:animate-pulse" aria-hidden />
          {fmt(elapsed)}
        </span>
      )}
    </>
  );
}
