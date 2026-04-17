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

  const shouldSeekToGeneratedPart =
    showOnlyGeneratedPart && generatedFrames > 0 && Number.isFinite(fps) && fps > 0;

  const targetGeneratedDuration = useMemo(() => {
    if (!shouldSeekToGeneratedPart) return 0;
    return generatedFrames / fps;
  }, [shouldSeekToGeneratedPart, generatedFrames, fps]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    didInitialSeekRef.current = false;

    const applyInitialSeek = () => {
      if (!video || didInitialSeekRef.current) return;

      if (!shouldSeekToGeneratedPart) {
        didInitialSeekRef.current = true;
        return;
      }

      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;

      const startTime = Math.max(0, duration - targetGeneratedDuration);

      console.log("Video debug:", {
        src,
        duration,
        generatedFrames,
        fps,
        targetGeneratedDuration,
        startTime,
      });

      try {
        video.currentTime = startTime;
        didInitialSeekRef.current = true;
      } catch (err) {
        console.error("Failed to set currentTime", err);
      }
    };

    if (video.readyState >= 1) {
      applyInitialSeek();
    } else {
      video.addEventListener("loadedmetadata", applyInitialSeek, { once: true });
      return () => {
        video.removeEventListener("loadedmetadata", applyInitialSeek);
      };
    }
  }, [src, shouldSeekToGeneratedPart, targetGeneratedDuration, generatedFrames, fps]);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline
      controls={controls}
      preload="metadata"
      className={className}
      style={style}
    />
  );
}