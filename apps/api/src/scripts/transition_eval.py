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

def normalized_mae(img1: np.ndarray, img2: np.ndarray) -> float:
    return float(np.mean(np.abs(img1 - img2)) / 255.0)

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
        }

    return {
        "meanDx": float(np.mean(dx[mask])),
        "meanDy": float(np.mean(dy[mask])),
        "meanMagnitude": float(np.mean(mag[mask])),
    }


def average_motion_stats(stats_list: List[Dict[str, float]]) -> Dict[str, float]:
    if not stats_list:
        return {
            "meanDx": 0.0,
            "meanDy": 0.0,
            "meanMagnitude": 0.0,
        }

    return {
        "meanDx": mean([s["meanDx"] for s in stats_list]),
        "meanDy": mean([s["meanDy"] for s in stats_list]),
        "meanMagnitude": mean([s["meanMagnitude"] for s in stats_list]),
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

    # Appearance continuity:
    # parent[-5..-1] aligned with child[0..4]
    pairwise_ssims = [
        simple_ssim(parent_frames[n - 1 - i], child_frames[i])
        for i in range(n)
    ]
    appearance_score = 0.6 * mean(pairwise_ssims) + 0.4 * min(pairwise_ssims)

    boundary_motion = compute_flow_stats(parent_frames[-1], child_frames[0])

    boundary_motion_penalty = clamp01(boundary_motion["meanMagnitude"] / 6.0)
    boundary_motion_score = 1.0 - boundary_motion_penalty

    # Boundary jump:
    boundary_ssim = simple_ssim(parent_frames[-1], child_frames[0])
    boundary_mae = normalized_mae(parent_frames[-1], child_frames[0])
    boundary_mae_score = 1.0 - clamp01(boundary_mae * 5.0)

    boundary_jump_score = (
        0.45 * boundary_ssim +
        0.35 * boundary_mae_score +
        0.20 * boundary_motion_score
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

    motion_score, deltas = score_motion(parent_motion, child_motion)

    overall_01 = (
        0.15 * appearance_score +
        0.25 * motion_score +
        0.60 * boundary_jump_score
    )

    overall_score = int(round(overall_01 * 100))
    label = score_to_label(overall_score)

    out = {
        "appearanceScore": round(appearance_score, 4),
        "motionScore": round(motion_score, 4),
        "boundaryJumpScore": round(boundary_jump_score, 4),
        "overallScore": overall_score,
        "label": label,
        "details": {
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
        },
    }

    sys.stdout.write(json.dumps(out))


if __name__ == "__main__":
    main()