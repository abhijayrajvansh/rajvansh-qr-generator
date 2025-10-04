"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

const DEFAULT_VALUE = "https://abhijayrajvansh.com";
const ACTION_BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 active:translate-y-0 w-full sm:w-auto";

// Hook to detect if device is mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's md breakpoint
    };

    // Check on mount
    checkIsMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};

const Home = () => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [input, setInput] = useState(() => searchParams.get("content") ?? DEFAULT_VALUE);
  
  // Set different default sizes based on device type
  const getDefaultSize = useCallback(() => (isMobile ? 200 : 300), [isMobile]);
  const getMinSize = useCallback(() => (isMobile ? 120 : 160), [isMobile]);
  const getMaxSize = useCallback(() => (isMobile ? 320 : 400), [isMobile]);
  
  const [size, setSize] = useState(getDefaultSize());
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "default" | "success" | "error";
  } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const qrValue = input.trim() || DEFAULT_VALUE;

  // Keep query param synced with user input so links remain shareable
  useEffect(() => {
    const trimmedValue = input.trim();
    const params = new URLSearchParams(searchParamsString);
    const currentValue = params.get("content") ?? "";

    if (trimmedValue.length === 0) {
      if (!currentValue) {
        return;
      }
      params.delete("content");
    } else {
      if (trimmedValue === currentValue) {
        return;
      }
      params.set("content", trimmedValue);
    }

    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [input, pathname, router, searchParamsString]);

  // Update size when device type changes
  useEffect(() => {
    const newDefaultSize = getDefaultSize();
    const minSize = getMinSize();
    const maxSize = getMaxSize();
    
    // Only update if current size is outside the new range or if it's the old default
    if (size < minSize || size > maxSize || size === (isMobile ? 280 : 200)) {
      setSize(newDefaultSize);
    }
  }, [getDefaultSize, getMaxSize, getMinSize, isMobile, size]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const setTransientFeedback = (
    message: string,
    tone: "default" | "success" | "error" = "default",
  ) => {
    setFeedback({ message, tone });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setFeedback(null), 3200);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setTransientFeedback("QR code is still rendering.", "error");
      return;
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "rajvanshqr-code.png";
    link.click();

    setTransientFeedback("Downloaded QR code as PNG.", "success");
  };

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      setTransientFeedback("Clipboard access is unavailable.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(qrValue);
      setTransientFeedback("Copied encoded text to clipboard.", "success");
    } catch {
      setTransientFeedback("Could not copy to clipboard.", "error");
    }
  };

  const feedbackToneClass = feedback
    ? feedback.tone === "success"
      ? "text-emerald-600"
      : feedback.tone === "error"
        ? "text-rose-600"
        : "text-slate-500"
    : "";

  return (
    <main className="min-h-screen px-4 py-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 lg:gap-8 lg:mt-8">
        <header className="rounded-3xl border border-sky-100 bg-white/70 p-4 md:p-10 text-center shadow-xl backdrop-blur-lg sm:text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Realtime QR Generator
          </h1>
          <p className="mt-2 text-base text-slate-600 sm:text-lg">
            Generate & Download QR Codes Instantly!
          </p>
        </header>

        <section className="grid gap-3 lg:gap-8 lg:grid-cols-2">
          <form className="flex flex-col gap-6 rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-lg backdrop-blur" onSubmit={(event) => event.preventDefault()}>
            <div className="flex flex-col gap-2">
              <label htmlFor="qr-content" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Content to encode
              </label>
              <textarea
                id="qr-content"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={2}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2 text-base text-slate-800 shadow-inner transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder="Paste a URL, drop a note, or add contact details..."
              />
            </div>

            <div className="hidden flex-col gap-3 md:flex">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>QR size</span>
                <span>{size}px</span>
              </div>
              <input
                type="range"
                min={getMinSize()}
                max={getMaxSize()}
                step={16}
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                className="w-full accent-sky-500"
                aria-label="QR code size"
              />
            </div>
          </form>

          <aside className="flex flex-col items-center gap-6 rounded-3xl border border-sky-100 bg-white/80 p-6 text-center shadow-lg backdrop-blur">
            <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm p-5">
              <QRCodeCanvas
                ref={canvasRef}
                value={qrValue}
                size={size}
                level="H"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <button type="button" onClick={handleDownload} className={ACTION_BUTTON_CLASSES}>
                Download PNG
              </button>
              <button type="button" onClick={handleCopy} className={ACTION_BUTTON_CLASSES}>
                Copy Encoded Text
              </button>
            </div>
            {feedback && (
              <p className={`text-sm font-medium ${feedbackToneClass}`} aria-live="polite">
                {feedback.message}
              </p>
            )}
          </aside>
        </section>
        
        <footer className="text-center py-4">
          <p className="text-base text-slate-400 opacity-90 hover:opacity-80 transition-opacity">
            <a 
              href="https://abhijayrajvansh.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition-colors"
            >
              ©{" "}A. Rajvansh.{" "}All rights reserved.
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
};

const PageFallback = () => (
  <main className="flex min-h-screen items-center justify-center px-4 py-5 text-slate-500">
    Loading…
  </main>
);

export default function HomePage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Home />
    </Suspense>
  );
}
