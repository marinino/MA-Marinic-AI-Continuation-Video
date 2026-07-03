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
  syncCommand,
  style,
  className,
}: {
  src: string;
  playback?: VideoSegmentPlayback;
  showOnlyGeneratedPart?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
syncCommand?: {
  action: "play" | "pause" | "forward5" | "backward5";
  id: number;
} | null;
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

    const seekToGeneratedStart = () => {
      if (!shouldClampToGeneratedPart) return;

      const startTime = getGeneratedStartTime();

      try {
        video.currentTime = startTime;
      } catch {}
    };

    const applyInitialSeek = () => {
      if (!shouldClampToGeneratedPart) return;

      seekToGeneratedStart();
      didInitialSeekRef.current = true;
    };

    const handleLoadedMetadata = () => {
      applyInitialSeek();
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

    const handleTimeUpdate = () => {
      if (!shouldClampToGeneratedPart) return;

      const startTime = getGeneratedStartTime();

      if (video.currentTime < startTime) {
        try {
          video.currentTime = startTime;
        } catch {}
      }
    };

    const handleEnded = () => {
      if (!shouldClampToGeneratedPart || !loop) return;

      seekToGeneratedStart();

      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
    };

    if (video.readyState >= 1) {
      applyInitialSeek();
    } else {
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
    }

    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [src, shouldClampToGeneratedPart, generatedDuration, loop, showOnlyGeneratedPart]);

useEffect(() => {
  const video = ref.current;
  if (!video || !syncCommand) return;

  switch (syncCommand.action) {
    case "play": {
      video.currentTime = 0;

      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
      break;
    }

    case "pause":
      video.pause();
      break;

    case "forward5":
      video.currentTime = Math.min(
        video.duration || Infinity,
        video.currentTime + 5
      );
      break;

    case "backward5":
      video.currentTime = Math.max(
        0,
        video.currentTime - 5
      );
      break;
  }
}, [syncCommand]);

  return (
    <video
      key={`${src}-${showOnlyGeneratedPart ? "generated" : "full"}-${generatedFrames}`}
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
