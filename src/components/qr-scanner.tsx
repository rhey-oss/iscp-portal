"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

export function QrScanner({ onDetect }: { onDetect: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbackRef = useRef(onDetect);
  const [error, setError] = useState("");

  useEffect(() => {
    callbackRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;

    async function start() {
      const win = window as unknown as { BarcodeDetector?: DetectorConstructor };
      const DetectorClass = win.BarcodeDetector;

      if (!DetectorClass || !navigator.mediaDevices?.getUserMedia) {
        setError("Camera QR scanning is not available in this browser. Enter the code manually.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const detector = new DetectorClass({ formats: ["qr_code"] });
        timer = window.setInterval(async () => {
          if (video.readyState < 2) return;
          try {
            const codes = await detector.detect(video);
            if (codes[0]?.rawValue) callbackRef.current(codes[0].rawValue);
          } catch {
            // Ignore transient decode errors while the camera adjusts.
          }
        }, 400);
      } catch {
        setError("Camera unavailable. Enter the code manually.");
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="space-y-2">
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-36 w-full rounded-xl bg-black object-cover"
        aria-label="QR scanner camera preview"
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Camera className="size-3.5" aria-hidden />
        Point the camera at a QR code — the code is filled in automatically.
      </p>
    </div>
  );
}
