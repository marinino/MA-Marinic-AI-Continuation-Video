import { useEffect, useMemo, useRef } from "react";
import { VideoSegmentPlayback } from "../types/ui";

export function VideoSegmentPlayer({
  src,
  playback,
  showOnlyGeneratedPart = false,
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  style,
  className,
}: {
  src: string;
  playback?: VideoSegmentPlayback;
  showOnlyGeneratedPart?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const didInitialSeekRef = useRef(false);

  const generatedFrames = playback?.generatedFrames ?? 0;
  const fps = 16;

  const shouldClampToGeneratedPart =
    showOnlyGeneratedPart && generatedFrames > 0 && Number.isFinite(fps) && fps > 0;

  const useCustomLoop = loop && shouldClampToGeneratedPart;

  const generatedDuration = useMemo(() => {
    if (!shouldClampToGeneratedPart) return 0;
    return generatedFrames / fps;
  }, [shouldClampToGeneratedPart, generatedFrames, fps]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    didInitialSeekRef.current = false;

    const getGeneratedStartTime = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return 0;
      return Math.max(0, duration - generatedDuration);
    };

    const applyInitialSeek = () => {
      if (!video || didInitialSeekRef.current) return;
      if (!shouldClampToGeneratedPart) {
        didInitialSeekRef.current = true;
        return;
      }

      const startTime = getGeneratedStartTime();

      try {
        video.currentTime = startTime;
        didInitialSeekRef.current = true;
      } catch (err) {
        console.error("Failed to set initial currentTime", err);
      }
    };

    const handleEnded = () => {
      if (!shouldClampToGeneratedPart) return;

      const startTime = getGeneratedStartTime();

      try {
        video.currentTime = startTime;

        if (loop) {
          const p = video.play();
          if (p && typeof p.catch === "function") {
            p.catch(() => {});
          }
        }
      } catch {}
    };

    const handleSeeking = () => {
      if (!shouldClampToGeneratedPart) return;
      const startTime = getGeneratedStartTime();

      if (video.currentTime < startTime) {
        try {
          video.currentTime = startTime;
        } catch {}
      }
    };

    if (video.readyState >= 1) {
      applyInitialSeek();
    } else {
      video.addEventListener("loadedmetadata", applyInitialSeek, { once: true });
    }

    video.addEventListener("ended", handleEnded);
    video.addEventListener("seeking", handleSeeking);

    return () => {
      video.removeEventListener("loadedmetadata", applyInitialSeek);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("seeking", handleSeeking);
    };
  }, [src, shouldClampToGeneratedPart, generatedDuration]);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay={autoPlay}
      loop={useCustomLoop ? false : loop}
      muted={muted}
      playsInline
      controls={controls}
      preload="metadata"
      className={className}
      style={style}
    />
  );
}
