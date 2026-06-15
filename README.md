# Interactive Workflows for Multi-Path Scene Continuation in Generative Video Systems

Visual-interactive framework for exploring, comparing, editing, and tracking AI-generated video continuations through a graph-based workflow representation.

The system was developed as part of a master's thesis at the Institute for Visualization and Interactive Systems (VIS), University of Stuttgart.

---

# Features

## Graph-Based Workflow Representation

The application represents video generation workflows as a graph consisting of different node types:

### Clip Nodes

* Generated video clips
* Imported video clips
* Intermediate workflow states
* Video preview and metadata

### Parameter Nodes

* Prompt information
* Generation parameters
* Model settings
* Seeds and inference settings
* Provenance information for generation steps

### Edit Nodes

* Manual editing operations
* Editing provenance tracking
* DaVinci Resolve integration

### Import Nodes

* Imported external media
* Reintegrated timeline segments
* External workflow integration

---

## Timeline View

The timeline provides a compact view of the currently selected workflow path.

Features include:

* Temporal clip ordering
* Path visualization
* Synchronization between graph and timeline
* Direct navigation between timeline and graph nodes
* Visual distinction between generated and edited content

---

## AI Generation Integration

The framework integrates with ComfyUI-based video generation pipelines.

Supported workflows:

* Scene continuation
* Multi-path exploration
* Branching generation workflows
* Comparative evaluation of continuations

---

## Editing Workflow Integration

The framework supports integration with external editing software.

Current support:

* DaVinci Resolve
* Timeline import
* Clip export
* Re-integration of edited material
* Editing provenance tracking

---

# Requirements

## External Dependencies

The application currently relies on:

* Node.js (20+ recommended)
* pnpm
* Python 3.11
* ComfyUI
* DaVinci Resolve (optional but recommended)

---

# Installation

Clone the repository:

```bash
git clone <repository-url>
cd <repository>
```

Install dependencies:

```bash
pnpm install
```

Build workspace packages:

```bash
pnpm -r build
```

---

# Python Setup

Python 3.11 is required.

## Windows (pyenv)

Install pyenv:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" -OutFile ".\install-pyenv-win.ps1"

.\install-pyenv-win.ps1
```

Install Python:

```powershell
pyenv install 3.11.9
pyenv global 3.11.9
```

Verify installation:

```bash
python --version
```

---

# Environment Configuration

Create a `.env` file in the repository root.

Example:

```env
# Python executable inside the ComfyUI virtual environment
PYTHON_BIN=C:\Users\<username>\...\tools\comfyui\.venv\Scripts\python.exe

# DaVinci Resolve
RESOLVE_SCRIPT_LIB_DIR=C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting\Modules
RESOLVE_DIR=C:\Program Files\Blackmagic Design\DaVinci Resolve

# ComfyUI directories
COMFY_INPUT_DIR=C:\...\tools\comfyui\input
COMFY_OUTPUT_DIR=C:\...\tools\comfyui\output
COMFY_TEMP_DIR=C:\...\tools\comfyui\temp

# Transition evaluation
TRANSITION_EVAL_SCRIPT=C:\...\apps\api\src\scripts\transition_eval.py
```

## Environment Variables

| Variable                 | Description                                                             |
| ------------------------ | ----------------------------------------------------------------------- |
| `PYTHON_BIN`             | Python executable used for workflow execution and transition evaluation |
| `RESOLVE_SCRIPT_LIB_DIR` | DaVinci Resolve scripting API modules                                   |
| `RESOLVE_DIR`            | DaVinci Resolve installation directory                                  |
| `COMFY_INPUT_DIR`        | ComfyUI input directory                                                 |
| `COMFY_OUTPUT_DIR`       | ComfyUI output directory                                                |
| `COMFY_TEMP_DIR`         | ComfyUI temporary directory                                             |
| `TRANSITION_EVAL_SCRIPT` | Script used to evaluate transitions between clips                       |

---

# First-Time Setup

Before running the application:

1. Install Node.js
2. Install pnpm
3. Install Python 3.11
4. Set up ComfyUI
5. Create the `.env` file
6. Verify all configured paths
7. Run the startup script

---

# Starting the Application

The recommended way to launch the application is through the provided startup scripts.

## Windows

```powershell
.\scripts\start.bat
```

## Linux

```bash
./scripts/start.sh
```

The startup scripts automatically:

* check required dependencies
* activate the Python environment
* start backend services
* start frontend services
* launch required workers
* initialize generation integrations

---


# Project Structure

```text
apps/
├── api/
└── web/

packages/
└── shared/

scripts/

storage/
├── projects/
├── clips/
└── exports/

tools/
└── comfyui/
```

---

# Troubleshooting

## Missing Dependency: pnpm

Install pnpm globally:

```bash
npm install -g pnpm
```

Verify:

```bash
pnpm --version
```

---

## Missing Dependency: Node.js

Verify installation:

```bash
node --version
```

---

## Frontend Stuck on Loading

Backend is likely not running.

Verify:

```text
http://localhost:3001/health
```

Expected response:

```json
{
  "ok": true
}
```

---

## Cannot Connect to Frontend

Verify that the frontend development server is running:

```bash
pnpm -C apps/web dev
```

---

## ComfyUI Integration Not Working

Verify:

* ComfyUI is installed
* ComfyUI is running
* all ComfyUI paths are correctly configured
* Python environment is valid

---

## DaVinci Resolve Integration Not Working

Verify:

* DaVinci Resolve is installed
* scripting support is enabled
* Resolve paths are configured correctly

---

# Architecture

The system consists of:

* React frontend
* Fastify backend
* Shared TypeScript package
* Python evaluation scripts
* ComfyUI generation backend
* DaVinci Resolve integration

The architecture is designed to support provenance-aware AI video generation workflows and iterative exploration of alternative scene continuations.

---

# License

This project was developed as part of a master's thesis at the Institute for Visualization and Interactive Systems (VIS), University of Stuttgart.
