#!/usr/bin/env python3
import json
import os
import sys

def bootstrap_paths():
    # 1) Module-Pfad (DaVinciResolveScript.py)
    lib_dir = os.environ.get("RESOLVE_SCRIPT_LIB_DIR")
    if lib_dir and lib_dir not in sys.path:
        sys.path.insert(0, lib_dir)

    # 2) DLL-Pfad (fusionscript.dll etc.)
    resolve_dir = os.environ.get("RESOLVE_DIR")
    if resolve_dir:
        try:
            os.add_dll_directory(resolve_dir)
        except Exception:
            # add_dll_directory gibt es erst ab 3.8; du bist 3.12 => ok, aber safe.
            pass
        os.environ["PATH"] = resolve_dir + ";" + os.environ.get("PATH", "")

def load_resolve_script_module():
    bootstrap_paths()
    import DaVinciResolveScript as dvr  # type: ignore
    return dvr

def main():
    dvr = load_resolve_script_module()

    resolve = dvr.scriptapp("Resolve")
    if not resolve:
        print(json.dumps({"ok": False, "error": "Resolve scriptapp not found. Is Resolve running?"}))
        return 2

    pm = resolve.GetProjectManager()
    project = pm.GetCurrentProject()
    if not project:
        print(json.dumps({"ok": False, "error": "No current project open in Resolve."}))
        return 3

    timeline = project.GetCurrentTimeline()
    if not timeline:
        print(json.dumps({"ok": False, "error": "No current timeline in Resolve."}))
        return 4

    out = {
        "ok": True,
        "project": {"name": project.GetName()},
        "timeline": {
            "name": timeline.GetName(),
            "frameRate": project.GetSetting("timelineFrameRate"),
            "markers": timeline.GetMarkers() or {},
        },
        "tracks": {"video": [], "audio": []},
    }

    def dump_track(kind: str):
        tracks = []
        count = timeline.GetTrackCount(kind) or 0
        for t in range(1, count + 1):
            items = timeline.GetItemListInTrack(kind, t) or []
            track_items = []
            for it in items:
                props = it.GetClipProperty() or {}
                track_items.append({
                    "trackIndex": t,
                    "name": it.GetName(),
                    "start": it.GetStart(),
                    "end": it.GetEnd(),
                    "duration": it.GetDuration(),
                    "clipProperty": props,
                    "markers": it.GetMarkers() or {},
                })
            tracks.append({"trackIndex": t, "items": track_items})
        return tracks

    out["tracks"]["video"] = dump_track("video")
    out["tracks"]["audio"] = dump_track("audio")

    out["summary"] = {
        "videoItems": sum(len(t["items"]) for t in out["tracks"]["video"]),
        "timelineMarkers": len(out["timeline"]["markers"] or {}),
    }

    print(json.dumps(out, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
