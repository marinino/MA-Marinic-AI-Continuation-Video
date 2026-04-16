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

  const startTime = useMemo(() => {
    if (!showOnlyGeneratedPart) return 0;

    const fps = playback?.fps;
    const generatedStartFrame = playback?.generatedStartFrame;
    const hasGeneratedSegment = playback?.hasGeneratedSegment;

    if (!hasGeneratedSegment) return 0;
    if (typeof fps !== "number" || !Number.isFinite(fps) || fps <= 0) return 0;
    if (
      typeof generatedStartFrame !== "number" ||
      !Number.isFinite(generatedStartFrame) ||
      generatedStartFrame < 0
    ) {
      return 0;
    }

    return generatedStartFrame / fps;
  }, [
    showOnlyGeneratedPart,
    playback?.fps,
    playback?.generatedStartFrame,
    playback?.hasGeneratedSegment,
  ]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const applyStartTime = () => {
      try {
        video.currentTime = startTime > 0 ? startTime : 0;
      } catch {}
    };

    if (video.readyState >= 1) {
      applyStartTime();
    } else {
      video.addEventListener("loadedmetadata", applyStartTime, { once: true });
      return () => {
        video.removeEventListener("loadedmetadata", applyStartTime);
      };
    }
  }, [src, startTime]);

  return (
    <video
      key={`${src}-${startTime}`}
      ref={ref}
      src={src}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      playsInline
      controls={controls}
      className={className}
      style={style}
    />
  );
}