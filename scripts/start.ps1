#requires -Version 5.1

param (
  [switch]$DownloadModels,
  [switch]$CpuOnly
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Need-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing dependency: $name"
  }
}

function Write-Info($msg) {
  Write-Host ">> $msg"
}

# Resolve ROOT_DIR = repo root (assuming this script is in scripts\ and repo root is ..)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ROOT_DIR  = (Resolve-Path (Join-Path $ScriptDir "..")).Path

$COMFY_REPO = "https://github.com/comfyanonymous/ComfyUI.git"
$COMFY_PORT = if ($env:COMFY_PORT) { $env:COMFY_PORT } else { "8188" }

$BACKEND_DIR  = Join-Path $ROOT_DIR "apps\api"
$FRONTEND_DIR = Join-Path $ROOT_DIR "apps\web"

$env:COMFY_URL = "http://127.0.0.1:$COMFY_PORT"
$env:COMFY_DIR = Join-Path $ROOT_DIR "tools\comfyui"

$COMFY_DIR = $env:COMFY_DIR

$procs = New-Object System.Collections.Generic.List[System.Diagnostics.Process]

function Start-Bg(
  [string]$name,
  [string]$file,
  [string[]]$argList,
  [string]$workdir
) {
  Write-Host ">> Starting: $name"

  # Normalize args -> string[] (no null/empty)
  $cleanArgs = @()
  if ($null -ne $argList) {
    foreach ($a in $argList) {
      if ($null -eq $a) { continue }
      $s = [string]$a
      if (-not [string]::IsNullOrWhiteSpace($s)) { $cleanArgs += $s }
    }
  }

  function Resolve-CmdPath([string]$cmd) {
    $ci = Get-Command $cmd -ErrorAction Stop

    # In PS 5.1, prefer .Path; fallback to .Definition
    if ($ci.PSObject.Properties.Match('Path').Count -gt 0 -and $ci.Path) {
      return $ci.Path
    }
    if ($ci.PSObject.Properties.Match('Definition').Count -gt 0 -and $ci.Definition) {
      return $ci.Definition
    }

    throw "Could not resolve command path for: $cmd"
  }

  # Prefer .cmd (pnpm/npm/npx often have .cmd) if it exists
  $resolved = $null
  try {
    $resolved = Resolve-CmdPath "$file.cmd"
  } catch {
    $resolved = Resolve-CmdPath $file
  }

  # DEBUG
  Write-Host ("   CMD: " + $resolved)
  Write-Host ("   WD : " + $workdir)
  Write-Host ("   ARGS(" + $cleanArgs.Count + "): " + ($cleanArgs -join " | "))

  $ext = [IO.Path]::GetExtension($resolved).ToLowerInvariant()

  if ($ext -eq ".ps1") {
    # If resolved is a ps1 script (e.g. pnpm.ps1), run via pwsh/powershell explicitly
    $psHost = $null
    try { $psHost = Resolve-CmdPath "pwsh" } catch { $psHost = Resolve-CmdPath "powershell" }

    $p = Start-Process -FilePath $psHost `
      -ArgumentList (@("-NoProfile","-ExecutionPolicy","Bypass","-File",$resolved) + $cleanArgs) `
      -WorkingDirectory $workdir `
      -PassThru `
      -NoNewWindow
  }
  else {
    if ($cleanArgs.Count -gt 0) {
      $p = Start-Process -FilePath $resolved `
        -ArgumentList $cleanArgs `
        -WorkingDirectory $workdir `
        -PassThru `
        -NoNewWindow
    } else {
      $p = Start-Process -FilePath $resolved `
        -WorkingDirectory $workdir `
        -PassThru `
        -NoNewWindow
    }
  }

  $procs.Add($p)
  Write-Host "   PID: $($p.Id)"
}














function Cleanup {
  Write-Host ""
  Write-Host "Stopping processes..."
  foreach ($p in $procs) {
    try {
      if (-not $p.HasExited) {
        $p.CloseMainWindow() | Out-Null
        Start-Sleep -Milliseconds 300
      }
    } catch {}
  }
  foreach ($p in $procs) {
    try {
      if (-not $p.HasExited) {
        $p.Kill()
      }
    } catch {}
  }
  Write-Host "Done."
}

# Ctrl+C handling
$null = Register-EngineEvent -SourceIdentifier ConsoleBreak -Action {
  Cleanup
  Exit 1
}

# Dependencies
Need-Cmd git
Need-Cmd pnpm
Need-Cmd curl

# Python: we require Python 3.11 for venv
# Python via pyenv-win (preferred)
# We want a Python 3.11.x interpreter (e.g., 3.11.9) and use it to create the venv.
$PYENV_PY = $null
$TARGET_PY = "3.11.9"

if (Get-Command pyenv -ErrorAction SilentlyContinue) {
  Write-Info "pyenv found. Ensuring Python $TARGET_PY is installed..."

  # Install if missing (pyenv-win prints list; simplest is try install and ignore "already installed")
  try {
    pyenv install $TARGET_PY | Out-Null
  } catch {
    # If it's already installed, pyenv may still exit non-zero depending on version; ignore if present
    $installed = pyenv versions | Select-String -SimpleMatch $TARGET_PY
    if (-not $installed) { throw }
  }

  Write-Info "Setting local pyenv version to $TARGET_PY (repo root)"
  Push-Location $ROOT_DIR
  try {
    pyenv local $TARGET_PY | Out-Null
  } finally {
    Pop-Location
  }

  # IMPORTANT: refresh shims so 'python' points to the selected version
  pyenv rehash | Out-Null

  # Use the python that pyenv provides (via PATH/shims)
  $PYENV_PY = (Get-Command python -ErrorAction Stop).Source
  $pyVersionFull = & $PYENV_PY -c "import sys; print('.'.join(map(str, sys.version_info[:3])))"
  if (-not ($pyVersionFull -like "3.11.*")) {
    throw "pyenv python is not 3.11.x (got $pyVersionFull). Check pyenv-win installation."
  }

  Write-Info "Using pyenv Python: $(& $PYENV_PY --version)"
} else {
  throw @"
Python 3.11 is required, but pyenv was not found.

Please install pyenv-win first (recommended), then re-run:
  - Install: https://github.com/pyenv-win/pyenv-win
  - After install, open a NEW PowerShell so PATH updates apply.

Alternatively install Python 3.11 system-wide and ensure 'python' is 3.11.x.
"@
}

# We'll use $PYENV_PY from here on
$PYBIN = $PYENV_PY


# ffmpeg required
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw @"
ERROR: ffmpeg is required but was not found.
This is needed for ComfyUI-VideoHelperSuite (VHS).

Please install ffmpeg and make sure it is in your PATH.
Test: ffmpeg -version
"@
}

# Build shared
Write-Info "Installing workspace deps (pnpm -w install)"
pnpm -w install

$SHARED_DIR = Join-Path $ROOT_DIR "packages\shared"
if (-not (Test-Path (Join-Path $SHARED_DIR "package.json"))) {
  throw "ERROR: @ma/shared not found at $SHARED_DIR. Adjust SHARED_DIR in start.ps1."
}

Write-Info "Building @ma/shared"
pnpm -C $SHARED_DIR build

# tools dir
New-Item -ItemType Directory -Force -Path (Join-Path $ROOT_DIR "tools") | Out-Null

# 1) Clone ComfyUI
if (-not (Test-Path (Join-Path $COMFY_DIR ".git"))) {
  Write-Info "Cloning ComfyUI into $COMFY_DIR"
  git clone $COMFY_REPO $COMFY_DIR
} else {
  Write-Info "ComfyUI already exists at $COMFY_DIR (not pulling automatically)"
}

# 2) venv
$venvDir = Join-Path $COMFY_DIR ".venv"
$venvPy  = Join-Path $venvDir "Scripts\python.exe"
$venvPip = Join-Path $venvDir "Scripts\pip.exe"

if (-not (Test-Path $venvPy)) {
  Write-Info "Creating ComfyUI venv"
  & $PYBIN -m venv $venvDir
}

Write-Info "Upgrading pip tooling"
& $venvPy -m pip install --upgrade pip "setuptools<82" wheel

# 3) Install requirements (filtered: skip comfy-kitchen)
$REQ_IN  = Join-Path $COMFY_DIR "requirements.txt"
$REQ_TMP = Join-Path $COMFY_DIR "requirements.filtered.txt"
(Get-Content $REQ_IN) | Where-Object { $_ -notmatch '^\s*comfy-kitchen\b' } | Set-Content $REQ_TMP -Encoding utf8

Write-Info "Installing ComfyUI requirements (filtered)"
& $venvPip install -r $REQ_TMP

# 4) Install comfy-kitchen (needed for FP8/FP4)
Write-Info "Installing comfy-kitchen (FP8/FP4 support)"
try {
  & $venvPip install -U comfy-kitchen
} catch {
  Write-Host "!! comfy-kitchen wheel install failed; trying source install from GitHub"
  & $venvPip install -U "git+https://github.com/Comfy-Org/comfy-kitchen.git"
}

# 5) ComfyUI Manager
$customNodesDir = Join-Path $COMFY_DIR "custom_nodes"
$MANAGER_DIR    = Join-Path $customNodesDir "ComfyUI-Manager"
New-Item -ItemType Directory -Force -Path $customNodesDir | Out-Null

if (-not (Test-Path (Join-Path $MANAGER_DIR ".git"))) {
  Write-Info "Installing ComfyUI Manager"
  git clone "https://github.com/ltdrdata/ComfyUI-Manager" $MANAGER_DIR
} else {
  Write-Info "Updating ComfyUI Manager"
  git -C $MANAGER_DIR pull --ff-only | Out-Null
}

# 6) Dirs
New-Item -ItemType Directory -Force -Path (Join-Path $ROOT_DIR "workflows") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $COMFY_DIR "output") | Out-Null

# ---- Model downloads block ----
function Download-IfMissing([string]$url, [string]$relpath) {
  $out = Join-Path $COMFY_DIR $relpath
  $outdir = Split-Path -Parent $out
  New-Item -ItemType Directory -Force -Path $outdir | Out-Null

  if (Test-Path $out) {
    Write-Info "Model exists, skipping: $relpath"
    return
  }

  Write-Info "Downloading model: $relpath"
  $part = "$out.part"
  curl.exe -L --fail -C - -o $part $url
  Move-Item -Force $part $out

  if ((Get-Item $out).Length -eq 0) {
    throw "ERROR: Download produced empty file: $relpath"
  }
  Write-Info "Finished: $relpath"
}

# Ensure model directories exist
if ($DownloadModels) {
    Write-Info "Model download ENABLED"
    $md = Join-Path $COMFY_DIR "models"
    New-Item -ItemType Directory -Force -Path (Join-Path $md "diffusion_models") | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $md "loras") | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $md "text_encoders") | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $md "vae") | Out-Null

    # ---- diffusion models (FP16, not FP8) ----
    Download-IfMissing `
    "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_i2v_high_noise_14B_fp16.safetensors" `
    "models\diffusion_models\wan2.2_i2v_high_noise_14B_fp16.safetensors"

    Download-IfMissing `
    "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_i2v_low_noise_14B_fp16.safetensors" `
    "models\diffusion_models\wan2.2_i2v_low_noise_14B_fp16.safetensors"

    Download-IfMissing `
    "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_t2v_low_noise_14B_fp16.safetensors" `
    "models\diffusion_models\wan2.2_t2v_low_noise_14B_fp16.safetensors"

    Download-IfMissing `
    "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_t2v_high_noise_14B_fp16.safetensors" `
    "models\diffusion_models\wan2.2_t2v_high_noise_14B_fp16.safetensors"

    # ---- LoRAs ----
    Download-IfMissing `
    "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/loras/wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors" `
    "models\loras\wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors"

    Download-IfMissing `
    "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/loras/wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors" `
    "models\loras\wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors"

    Download-IfMissing `
    "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/loras/wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors" `
    "models\loras\wan2.2_t2v_lightx2v_4steps_lora_v1.1_high_noise.safetensors"

    Download-IfMissing `
    "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/loras/wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors" `
    "models\loras\wan2.2_t2v_lightx2v_4steps_lora_v1.1_low_noise.safetensors"

    # ---- text encoder (FP16) ----
    Download-IfMissing `
    "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp16.safetensors" `
    "models\text_encoders\umt5_xxl_fp16.safetensors"

    # ---- VAE ----
    Download-IfMissing `
    "https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors" `
    "models\vae\wan_2.1_vae.safetensors"
} else {
  Write-Info "Model download SKIPPED (use -DownloadModels to enable)"
}


# ---- Custom nodes ----
function Install-CustomNode([string]$name, [string]$repo) {
  $dir = Join-Path $customNodesDir $name
  if (-not (Test-Path (Join-Path $dir ".git"))) {
    Write-Info "Installing custom node: $name"
    git clone $repo $dir
  } else {
    Write-Info "Updating custom node: $name"
    git -C $dir pull --ff-only | Out-Null
  }

  $req = Join-Path $dir "requirements.txt"
  $pyproject = Join-Path $dir "pyproject.toml"

  if (Test-Path $req) {
    Write-Info "Installing python deps for $name (requirements.txt)"
    & $venvPip install -r $req
  } elseif (Test-Path $pyproject) {
    Write-Info "Installing python deps for $name (pyproject.toml)"
    & $venvPip install -e $dir
  }
}

Install-CustomNode "ComfyUI-Easy-Use" "https://github.com/yolain/ComfyUI-Easy-Use"
Install-CustomNode "ComfyUI-VideoHelperSuite" "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite"
Install-CustomNode "ComfyUI_essentials" "https://github.com/cubiq/ComfyUI_essentials"
Install-CustomNode "comfyui-videoframenode" "https://github.com/esp-dev/comfyui-videoframenode"



Write-Host "BACKEND_DIR=$BACKEND_DIR"
Write-Host "Exists? " (Test-Path $BACKEND_DIR)
Write-Host "Has package.json? " (Test-Path (Join-Path $BACKEND_DIR "package.json"))


$comfyArgs = @(
  "$COMFY_DIR\main.py",
  "--listen", "127.0.0.1",
  "--port", "$COMFY_PORT"
)

if ($CpuOnly) {
  Write-Info "Starting ComfyUI in CPU-only mode"
  $comfyArgs += "--cpu"
} else {
  Write-Info "Starting ComfyUI with CUDA settings"
  $comfyArgs += "--cuda-malloc"
}

Start-Bg "ComfyUI" $venvPy $comfyArgs $COMFY_DIR

Write-Host "BACKEND_DIR=$BACKEND_DIR"
Write-Host "Exists? " (Test-Path $BACKEND_DIR)
Write-Host "Has package.json? " (Test-Path (Join-Path $BACKEND_DIR "package.json"))

Start-Bg "Backend (Fastify)" "pnpm" @("-C", $BACKEND_DIR, "run", "dev") $ROOT_DIR
Start-Bg "Frontend"         "pnpm" @("-C", $FRONTEND_DIR, "run", "dev") $ROOT_DIR








Write-Host ""
Write-Host "All services started:"
Write-Host " - ComfyUI  : http://127.0.0.1:$COMFY_PORT"
Write-Host " - Backend  : http://127.0.0.1:3001/health"
Write-Host " - COMFY_URL env for backend: $($env:COMFY_URL)"
Write-Host ""
Write-Host "Press Ctrl+C to stop everything."

try {
  while ($true) {
    Start-Sleep -Seconds 1
    # Optional: auto-exit if any process died
    foreach ($p in $procs) {
      if ($p.HasExited) {
        throw "Process exited unexpectedly (PID $($p.Id))."
      }
    }
  }
} finally {
  Cleanup
}
