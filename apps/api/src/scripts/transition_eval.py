#!/usr/bin/env python3
import json
import math
import sys
from typing import List, Dict, Any

import cv2 as cv
import numpy as np


def read_json_stdin() -> Dict[str, Any]:
    raw = sys.stdin.read()
    return json.loads(raw)


def load_gray(path: str) -> np.ndarray:
    img = cv.imread(path, cv.IMREAD_GRAYSCALE)
    if img is None:
        raise RuntimeError(f"Could not read image: {path}")
    return img.astype(np.float32)


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def mean(values: List[float]) -> float:
    if not values:
        return 0.0
    return float(sum(values) / len(values))

def weighted_mean(values: List[float], weights: List[float]) -> float:
    if not values or not weights or len(values) != len(weights):
        return 0.0

    weight_sum = sum(weights)
    if weight_sum == 0:
        return 0.0

    return float(sum(v * w for v, w in zip(values, weights)) / weight_sum)

def normalized_mae(img1: np.ndarray, img2: np.ndarray) -> float:
    return float(np.mean(np.abs(img1 - img2)) / 255.0)

def brightness_contrast_score(img1: np.ndarray, img2: np.ndarray) -> float:
    mean_delta = abs(float(np.mean(img1)) - float(np.mean(img2))) / 255.0
    std_delta = abs(float(np.std(img1)) - float(np.std(img2))) / 128.0

    penalty = 0.6 * clamp01(mean_delta * 4.0) + 0.4 * clamp01(std_delta * 3.0)
    return 1.0 - penalty

def edge_difference_score(img1: np.ndarray, img2: np.ndarray) -> float:
    e1 = cv.Canny(img1.astype(np.uint8), 80, 160)
    e2 = cv.Canny(img2.astype(np.uint8), 80, 160)

    diff = float(np.mean(np.abs(e1.astype(np.float32) - e2.astype(np.float32))) / 255.0)
    return float(1.0 - clamp01(diff * 3.0))

def motion_direction_score(parent_motion: Dict[str, float], child_motion: Dict[str, float]) -> float:
    if parent_motion["meanMagnitude"] < 0.1 and child_motion["meanMagnitude"] < 0.1:
        return 1.0

    if parent_motion["meanMagnitude"] < 0.1 or child_motion["meanMagnitude"] < 0.1:
        return 0.5

    p_angle = math.atan2(parent_motion["meanDy"], parent_motion["meanDx"])
    c_angle = math.atan2(child_motion["meanDy"], child_motion["meanDx"])

    angle_delta = abs(p_angle - c_angle)
    angle_delta = min(angle_delta, 2 * math.pi - angle_delta)

    return 1.0 - clamp01(angle_delta / math.pi)

def json_safe(obj):
    if isinstance(obj, dict):
        return {k: json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [json_safe(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def simple_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    # Global SSIM approximation, sufficient for first backend MVP
    c1 = 6.5025
    c2 = 58.5225

    mu1 = float(np.mean(img1))
    mu2 = float(np.mean(img2))

    sigma1 = float(np.var(img1))
    sigma2 = float(np.var(img2))
    sigma12 = float(np.mean((img1 - mu1) * (img2 - mu2)))

    numerator = (2 * mu1 * mu2 + c1) * (2 * sigma12 + c2)
    denominator = (mu1 * mu1 + mu2 * mu2 + c1) * (sigma1 + sigma2 + c2)

    if denominator == 0:
        return 0.0
    return clamp01(numerator / denominator)

def local_ssim(img1: np.ndarray, img2: np.ndarray, grid: int = 4) -> Dict[str, float]:
    h, w = img1.shape
    tile_scores = []

    tile_h = h // grid
    tile_w = w // grid

    for gy in range(grid):
        for gx in range(grid):
            y1 = gy * tile_h
            y2 = h if gy == grid - 1 else (gy + 1) * tile_h
            x1 = gx * tile_w
            x2 = w if gx == grid - 1 else (gx + 1) * tile_w

            patch1 = img1[y1:y2, x1:x2]
            patch2 = img2[y1:y2, x1:x2]

            tile_scores.append(simple_ssim(patch1, patch2))

    return {
        "mean": mean(tile_scores),
        "min": min(tile_scores),
        "p10": float(np.percentile(tile_scores, 10)),
    }

def compute_flow_stats(img1: np.ndarray, img2: np.ndarray) -> Dict[str, float]:
    flow = cv.calcOpticalFlowFarneback(
        img1,
        img2,
        None,
        0.5,  # pyr_scale
        3,    # levels
        15,   # winsize
        3,    # iterations
        5,    # poly_n
        1.2,  # poly_sigma
        0
    )

    dx = flow[..., 0]
    dy = flow[..., 1]
    mag = np.sqrt(dx * dx + dy * dy)

    # Nur tatsächlich bewegte Pixel berücksichtigen
    mask = mag > 0.5

    if np.count_nonzero(mask) == 0:
        return {
            "meanDx": 0.0,
            "meanDy": 0.0,
            "meanMagnitude": 0.0,
            "stdMagnitude": 0.0,
            "p90Magnitude": 0.0,
            "movingPixelRatio": 0.0,
        }

    return {
        "meanDx": float(np.mean(dx[mask])),
        "meanDy": float(np.mean(dy[mask])),
        "meanMagnitude": float(np.mean(mag[mask])),
        "stdMagnitude": float(np.std(mag[mask])),
        "p90Magnitude": float(np.percentile(mag[mask], 90)),
        "movingPixelRatio": float(np.count_nonzero(mask) / mask.size),
    }


def average_motion_stats(stats_list: List[Dict[str, float]]) -> Dict[str, float]:
    if not stats_list:
        return {
            "meanDx": 0.0,
            "meanDy": 0.0,
            "meanMagnitude": 0.0,
            "stdMagnitude": 0.0,
            "p90Magnitude": 0.0,
            "movingPixelRatio": 0.0,
        }

    return {
        "meanDx": mean([s["meanDx"] for s in stats_list]),
        "meanDy": mean([s["meanDy"] for s in stats_list]),
        "meanMagnitude": mean([s["meanMagnitude"] for s in stats_list]),
        "stdMagnitude": mean([s["stdMagnitude"] for s in stats_list]),
        "p90Magnitude": mean([s["p90Magnitude"] for s in stats_list]),
        "movingPixelRatio": mean([s["movingPixelRatio"] for s in stats_list]),
    }


def score_motion(parent_motion: Dict[str, float], child_motion: Dict[str, float]) -> (float, Dict[str, float]):
    dx_delta = abs(parent_motion["meanDx"] - child_motion["meanDx"])
    dy_delta = abs(parent_motion["meanDy"] - child_motion["meanDy"])
    mag_delta = abs(parent_motion["meanMagnitude"] - child_motion["meanMagnitude"])

    # Heuristische Normierung für 224x224 boundary frames
    dx_pen = clamp01(dx_delta / 3.0)
    dy_pen = clamp01(dy_delta / 3.0)
    mag_pen = clamp01(mag_delta / 3.0)

    penalty = 0.4 * dx_pen + 0.4 * dy_pen + 0.2 * mag_pen
    score = 1.0 - penalty

    return score, {
        "motionDxDelta": dx_delta,
        "motionDyDelta": dy_delta,
        "motionMagnitudeDelta": mag_delta,
    }

def motion_jerk_score(
    pre_cut_motion: Dict[str, float],
    cut_motion: Dict[str, float],
    post_cut_motion: Dict[str, float],
) -> float:
    cut_delta = abs(cut_motion["meanMagnitude"] - pre_cut_motion["meanMagnitude"])
    post_delta = abs(post_cut_motion["meanMagnitude"] - cut_motion["meanMagnitude"])

    p90_cut_delta = abs(cut_motion["p90Magnitude"] - pre_cut_motion["p90Magnitude"])
    p90_post_delta = abs(post_cut_motion["p90Magnitude"] - cut_motion["p90Magnitude"])

    moving_area_delta = abs(cut_motion["movingPixelRatio"] - pre_cut_motion["movingPixelRatio"])

    penalty = (
        0.45 * clamp01(cut_delta / 6.0) +
        0.25 * clamp01(post_delta / 6.0) +
        0.20 * clamp01((p90_cut_delta + p90_post_delta) / 10.0) +
        0.10 * clamp01(moving_area_delta * 3.0)
    )

    return 1.0 - penalty


def score_to_label(score_100: int) -> str:
    if score_100 >= 90:
        return "smooth"
    if score_100 >= 70:
        return "moderate"
    return "rough"


def main():
    payload = read_json_stdin()
    parent_frame_paths = payload["parentFrames"]
    child_frame_paths = payload["childFrames"]

    parent_frames = [load_gray(p) for p in parent_frame_paths]
    child_frames = [load_gray(p) for p in child_frame_paths]

    if len(parent_frames) != len(child_frames):
      raise RuntimeError("parentFrames and childFrames length mismatch")

    n = len(parent_frames)
    if n < 2:
        raise RuntimeError("Need at least 2 frames per side")

    pairwise_ssims = []
    local_ssim_means = []
    local_ssim_mins = []
    local_ssim_p10s = []

    weights = [
        1.0 / (i + 1)
        for i in range(n)
    ]

    for i in range(n):
        parent_frame = parent_frames[n - 1 - i]
        child_frame = child_frames[i]

        pairwise_ssims.append(simple_ssim(parent_frame, child_frame))

        local = local_ssim(parent_frame, child_frame, grid=4)
        local_ssim_means.append(local["mean"])
        local_ssim_mins.append(local["min"])
        local_ssim_p10s.append(local["p10"])

    child_temporal_ssims = [
        simple_ssim(child_frames[i], child_frames[i + 1])
        for i in range(n - 1)
    ]

    child_temporal_stability = (
        0.6 * mean(child_temporal_ssims) +
        0.4 * min(child_temporal_ssims)
    )

    parent_temporal_ssims = [
        simple_ssim(parent_frames[i], parent_frames[i + 1])
        for i in range(n - 1)
    ]

    temporal_stability_delta = abs(mean(parent_temporal_ssims) - mean(child_temporal_ssims))
    temporal_consistency_score = 1.0 - clamp01(temporal_stability_delta * 3.0)

    weighted_global_ssim = weighted_mean(pairwise_ssims, weights)
    weighted_local_ssim = weighted_mean(local_ssim_p10s, weights)

    appearance_score = (
        0.45 * weighted_global_ssim +
        0.35 * weighted_local_ssim +
        0.20 * min(local_ssim_mins)
)

    boundary_motion = compute_flow_stats(parent_frames[-1], child_frames[0])

    pre_cut_motion = compute_flow_stats(parent_frames[-2], parent_frames[-1])
    cut_motion = boundary_motion
    post_cut_motion = compute_flow_stats(child_frames[0], child_frames[1])

    motion_jerk = motion_jerk_score(pre_cut_motion, cut_motion, post_cut_motion)

    boundary_motion_penalty = clamp01(boundary_motion["meanMagnitude"] / 6.0)
    boundary_motion_score = 1.0 - boundary_motion_penalty

    boundary_edge_score = edge_difference_score(parent_frames[-1], child_frames[0])

    # Boundary jump:
    boundary_ssim = simple_ssim(parent_frames[-1], child_frames[0])
    boundary_mae = normalized_mae(parent_frames[-1], child_frames[0])
    boundary_mae_score = 1.0 - clamp01(boundary_mae * 5.0)

    boundary_brightness_score = brightness_contrast_score(parent_frames[-1], child_frames[0])

    visual_cut_score = (
        0.35 * boundary_ssim +
        0.30 * boundary_mae_score +
        0.20 * boundary_edge_score +
        0.15 * boundary_brightness_score
    )

    transition_score = (
        0.45 * visual_cut_score +
        0.18 * boundary_motion_score +
        0.14 * temporal_consistency_score +
        0.13 * child_temporal_stability +
        0.10 * motion_jerk
    )


    # Motion continuity:
    parent_flows = [
        compute_flow_stats(parent_frames[i], parent_frames[i + 1])
        for i in range(n - 1)
    ]
    child_flows = [
        compute_flow_stats(child_frames[i], child_frames[i + 1])
        for i in range(n - 1)
    ]

    parent_motion = average_motion_stats(parent_flows)
    child_motion = average_motion_stats(child_flows)
    motion_direction_continuity = motion_direction_score(parent_motion, child_motion)

    motion_score, deltas = score_motion(parent_motion, child_motion)

    motion_score = (
        0.75 * motion_score +
        0.25 * motion_direction_continuity
    )

    overall_01 = (
        0.15 * appearance_score +
        0.25 * motion_score +
        0.60 * transition_score
    )

    overall_score = int(round(overall_01 * 100))
    label = score_to_label(overall_score)

    out = {
        "appearanceScore": round(appearance_score, 4),
        "motionScore": round(motion_score, 4),
        "boundaryJumpScore": round(transition_score, 4),
        "transitionScore": round(transition_score, 4),
        "overallScore": overall_score,
        "label": label,
        "details": {
            "boundaryBrightnessScore": round(boundary_brightness_score, 4),
            "visualCutScore": round(visual_cut_score, 4),
            "boundaryEdgeScore": round(boundary_edge_score, 4),
            "childTemporalStability": round(child_temporal_stability, 4),
            "temporalConsistencyScore": round(temporal_consistency_score, 4),
            "transitionScore": round(transition_score, 4),
            "pairwiseSsimMean": round(mean(pairwise_ssims), 4),
            "pairwiseSsimMin": round(min(pairwise_ssims), 4),
            "boundarySsim": round(boundary_ssim, 4),
            "boundaryMae": round(boundary_mae, 4),
            "boundaryMaeScore": round(boundary_mae_score, 4),
            "boundaryMotionMagnitude": round(boundary_motion["meanMagnitude"], 4),
            "boundaryMotionScore": round(boundary_motion_score, 4),

            "parentMotionDx": round(parent_motion["meanDx"], 4),
            "parentMotionDy": round(parent_motion["meanDy"], 4),
            "parentMotionMagnitude": round(parent_motion["meanMagnitude"], 4),

            "childMotionDx": round(child_motion["meanDx"], 4),
            "childMotionDy": round(child_motion["meanDy"], 4),
            "childMotionMagnitude": round(child_motion["meanMagnitude"], 4),

            "motionDxDelta": round(deltas["motionDxDelta"], 4),
            "motionDyDelta": round(deltas["motionDyDelta"], 4),
            "motionMagnitudeDelta": round(deltas["motionMagnitudeDelta"], 4),
            "motionDirectionContinuity": round(motion_direction_continuity, 4),

            "weightedGlobalSsim": round(weighted_global_ssim, 4),
            "weightedLocalSsimP10": round(weighted_local_ssim, 4),
            "localSsimMin": round(min(local_ssim_mins), 4),

            "motionJerkScore": round(motion_jerk, 4),

            "preCutMotionMagnitude": round(pre_cut_motion["meanMagnitude"], 4),
            "cutMotionMagnitude": round(cut_motion["meanMagnitude"], 4),
            "postCutMotionMagnitude": round(post_cut_motion["meanMagnitude"], 4),

            "preCutMotionP90": round(pre_cut_motion["p90Magnitude"], 4),
            "cutMotionP90": round(cut_motion["p90Magnitude"], 4),
            "postCutMotionP90": round(post_cut_motion["p90Magnitude"], 4),

            "preCutMovingPixelRatio": round(pre_cut_motion["movingPixelRatio"], 4),
            "cutMovingPixelRatio": round(cut_motion["movingPixelRatio"], 4),
            "postCutMovingPixelRatio": round(post_cut_motion["movingPixelRatio"], 4),
        },
    }

    sys.stdout.write(json.dumps(json_safe(out)))


if __name__ == "__main__":
    main()