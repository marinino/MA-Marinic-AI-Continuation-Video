#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMFY_DIR="$ROOT_DIR/tools/comfyui"
COMFY_REPO="https://github.com/comfyanonymous/ComfyUI.git"
COMFY_PORT="${COMFY_PORT:-8188}"

BACKEND_DIR="$ROOT_DIR/apps/api"
FRONTEND_DIR="$ROOT_DIR/apps/web"   # ggf. anpassen

export COMFY_URL="http://127.0.0.1:${COMFY_PORT}"

pids=()
cleanup() {
  echo ""
  echo "Stopping processes..."
  for pid in "${pids[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then kill "$pid" >/dev/null 2>&1 || true; fi
  done
  sleep 0.5
  for pid in "${pids[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then kill -9 "$pid" >/dev/null 2>&1 || true; fi
  done
  echo "Done."
}
trap cleanup EXIT INT TERM

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1"; exit 1; }; }
start_bg() { local name="$1"; shift; echo ">> Starting: $name"; ( "$@" ) & pids+=("$!"); echo "   PID: ${pids[-1]}"; }

need_cmd git
need_cmd pnpm
need_cmd curl

# Try to make pyenv available even in non-interactive shells
export PYENV_ROOT="${PYENV_ROOT:-$HOME/.pyenv}"
export PATH="$PYENV_ROOT/bin:$PATH"

# Optional: also include common user bin paths
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/bin:$PATH"

# If pyenv exists, initialize it. Otherwise fall back to python3.
if command -v pyenv >/dev/null 2>&1; then
  eval "$(pyenv init --path)"
  eval "$(pyenv init -)"
  PYBIN="$(pyenv which python)"
else
  echo ">> pyenv not found in PATH. Falling back to python3."
  need_cmd python3
  PYBIN="$(command -v python3)"
fi

echo ">> Using Python: $("$PYBIN" --version)"


if ! command -v ffmpeg >/dev/null 2>&1; then
  echo ""
  echo "ERROR: ffmpeg is required but was not found."
  echo "This is needed for ComfyUI-VideoHelperSuite (VHS)."
  echo ""
  echo "Please install ffmpeg and make sure it is in your PATH."
  echo "You can test it with: ffmpeg -version"
  echo ""
  exit 1
fi


# Build shared
# -----------------------------
# Node workspace deps + build shared
# -----------------------------
echo ">> Installing workspace deps (pnpm -w install)"
pnpm -w install

# shared package path (falls du es mal verschiebst)
SHARED_DIR="$ROOT_DIR/packages/shared"
if [ ! -f "$SHARED_DIR/package.json" ]; then
  echo "ERROR: @ma/shared not found at $SHARED_DIR"
  echo "Adjust SHARED_DIR in start.sh."
  exit 1
fi

echo ">> Building @ma/shared"
pnpm -C "$SHARED_DIR" build


mkdir -p "$ROOT_DIR/tools"

# 1) ComfyUI clone
if [ ! -d "$COMFY_DIR/.git" ]; then
  echo ">> Cloning ComfyUI into $COMFY_DIR"
  git clone "$COMFY_REPO" "$COMFY_DIR"
else
  echo ">> ComfyUI already exists at $COMFY_DIR (not pulling automatically)"
fi

# 3) Ensure venv is Python 3.11
if [ -d "$COMFY_DIR/.venv" ]; then
  VENV_MM="$("$COMFY_DIR/.venv/bin/python" -c 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")' 2>/dev/null || echo "")"
  if [ "$VENV_MM" != "3.11" ]; then
    echo ">> Existing venv uses Python $VENV_MM, recreating for 3.11..."
    rm -rf "$COMFY_DIR/.venv"
  fi
fi

if [ ! -d "$COMFY_DIR/.venv" ]; then
  echo ">> Creating ComfyUI venv"
  "$PYBIN" -m venv "$COMFY_DIR/.venv"
fi

echo ">> Upgrading pip tooling"
"$COMFY_DIR/.venv/bin/python" -m pip install --upgrade pip setuptools wheel

# 4) Install requirements (filtered: skip comfy-kitchen)
REQ_IN="$COMFY_DIR/requirements.txt"
REQ_TMP="$COMFY_DIR/requirements.filtered.txt"
grep -vE '^\s*comfy-kitchen\b' "$REQ_IN" > "$REQ_TMP"

echo ">> Installing ComfyUI requirements (filtered)"
"$COMFY_DIR/.venv/bin/pip" install -r "$REQ_TMP"

# 4b) Install comfy-kitchen (needed for FP8/FP4)
echo ">> Installing comfy-kitchen (FP8/FP4 support)"
if ! "$COMFY_DIR/.venv/bin/pip" install -U comfy-kitchen; then
  echo "!! comfy-kitchen wheel install failed; trying source install from GitHub"
  "$COMFY_DIR/.venv/bin/pip" install -U "git+https://github.com/Comfy-Org/comfy-kitchen.git"
fi


# 5) ComfyUI Manager
MANAGER_DIR="$COMFY_DIR/custom_nodes/ComfyUI-Manager"
mkdir -p "$COMFY_DIR/custom_nodes"

if [ ! -d "$MANAGER_DIR/.git" ]; then
  echo ">> Installing ComfyUI Manager"
  git clone https://github.com/ltdrdata/ComfyUI-Manager "$MANAGER_DIR"
else
  echo ">> Updating ComfyUI Manager"
  git -C "$MANAGER_DIR" pull --ff-only || true
fi

# 6) Dirs
mkdir -p "$ROOT_DIR/workflows"
mkdir -p "$COMFY_DIR/output"


# -----------------------------
# Model downloads (Wan 2.x)
# -----------------------------


download_if_missing () {
  local url="$1"
  local relpath="$2"

  local out="$COMFY_DIR/$relpath"
  local outdir
  outdir="$(dirname "$out")"
  mkdir -p "$outdir"

  if [ -f "$out" ]; then
    echo ">> Model exists, skipping: $relpath"
    return 0
  fi

  echo ">> Downloading model:"
  echo "   $relpath"
  echo "   from $url"

  curl -L --fail -C - -o "$out.part" "$url"
  mv "$out.part" "$out"

  if [ ! -s "$out" ]; then
    echo "ERROR: Download produced empty file: $relpath"
    exit 1
  fi

  echo ">> Finished: $relpath"
}


# Ensure model directories exist
mkdir -p \
  "$COMFY_DIR/models/diffusion_models" \
  "$COMFY_DIR/models/loras" \
  "$COMFY_DIR/models/text_encoders" \
  "$COMFY_DIR/models/vae"

# ---- diffusion models (FP16, not FP8) ----
download_if_missing \
  "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_i2v_high_noise_14B_fp16.safetensors" \
  "models/diffusion_models/wan2.2_i2v_high_noise_14B_fp16.safetensors"

download_if_missing \
  "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_i2v_low_noise_14B_fp16.safetensors" \
  "models/diffusion_models/wan2.2_i2v_low_noise_14B_fp16.safetensors"

# ---- diff mod t2v ----
download_if_missing \
  "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_t2v_low_noise_14B_fp16.safetensors" \
  "models/diffusion_models/wan2.2_t2v_low_noise_14B_fp16.safetensors"

download_if_missing \
  "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_t2v_high_noise_14B_fp16.safetensors" \
  "models/diffusion_models/wan2.2_t2v_high_noise_14B_fp16.safetensors"

# ---- LoRAs ----
download_if_missing \
  "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/loras/wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors" \
  "models/loras/wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors"

download_if_missing \
  "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/loras/wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors" \
  "models/loras/wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors"

# ---- LoRAs (Wan 2.2 T2V) ----
download_if_missing \
  "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/loras/wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors" \
  "models/loras/wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors"

download_if_missing \
  "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/loras/wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors" \
  "models/loras/wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors"


# ---- text encoder (FP16, not FP8) ----
download_if_missing \
  "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp16.safetensors" \
  "models/text_encoders/umt5_xxl_fp16.safetensors"


# ---- VAE ----
download_if_missing \
  "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors" \
  "models/vae/wan_2.1_vae.safetensors"


# -----------------------------
# Custom nodes (clone + update + deps)
# -----------------------------
install_custom_node () {
  local name="$1"
  local repo="$2"
  local dir="$COMFY_DIR/custom_nodes/$name"

  if [ ! -d "$dir/.git" ]; then
    echo ">> Installing custom node: $name"
    git clone "$repo" "$dir"
  else
    echo ">> Updating custom node: $name"
    git -C "$dir" pull --ff-only || true
  fi

  # Install python deps if present
  if [ -f "$dir/requirements.txt" ]; then
    echo ">> Installing python deps for $name (requirements.txt)"
    "$COMFY_DIR/.venv/bin/pip" install -r "$dir/requirements.txt"
  elif [ -f "$dir/pyproject.toml" ]; then
    echo ">> Installing python deps for $name (pyproject.toml)"
    "$COMFY_DIR/.venv/bin/pip" install -e "$dir"
  fi
}

# ---- Required custom nodes for workflow ----

# Easy-Use nodes (easy string, etc.)
install_custom_node \
  "ComfyUI-Easy-Use" \
  "https://github.com/yolain/ComfyUI-Easy-Use"

# Video Helper Suite (VHS_LoadVideoFFmpeg, VHS_VideoInfoLoaded, ...)
install_custom_node \
  "ComfyUI-VideoHelperSuite" \
  "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite"

# Essentials (GetImageSize+, etc.)
install_custom_node \
  "ComfyUI_essentials" \
  "https://github.com/cubiq/ComfyUI_essentials"

# Video frame utilities (VideoFirstLastFrame)
install_custom_node \
  "comfyui-videoframenode" \
  "https://github.com/esp-dev/comfyui-videoframenode"



# 7) Start ComfyUI
start_bg "ComfyUI" \
  "$COMFY_DIR/.venv/bin/python" \
  "$COMFY_DIR/main.py" \
  --listen 127.0.0.1 \
  --port "$COMFY_PORT" \
  --cuda-malloc




# 8) Start Backend
start_bg "Backend (Fastify)" pnpm -C "$BACKEND_DIR" dev

# 9) Start Frontend
start_bg "Frontend" pnpm -C "$FRONTEND_DIR" dev


echo ""
echo "All services started:"
echo " - ComfyUI  : http://127.0.0.1:${COMFY_PORT}"
echo " - Backend  : http://127.0.0.1:3001/health"
echo " - COMFY_URL env for backend: $COMFY_URL"
echo ""
echo "Press Ctrl+C to stop everything."
wait
