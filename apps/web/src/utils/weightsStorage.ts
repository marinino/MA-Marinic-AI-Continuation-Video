import { DEFAULT_FORMULA_WEIGHTS } from "../graph/hooks/useV2VParams";
import { AppSettings, CustomScoreSlider, FormulaWeights } from "../graph/types/ui";

const KEY_FORMULA = "ma:v2v:formulaWeights:v1";
const KEY_CUSTOM = "ma:v2v:customScoreSliders:v1";
const KEY_CATEGORY_VISIBILITY = "ma:v2v:categoryVisibility:v1";
const KEY_SETTINGS = "ma:settings:v1";

// ---------------- FormulaWeights ----------------

export function loadFormulaWeights(): FormulaWeights {
  try {
    const raw = localStorage.getItem(KEY_FORMULA);
    if (!raw) return DEFAULT_FORMULA_WEIGHTS;
    const parsed = JSON.parse(raw);
    return deepMerge(DEFAULT_FORMULA_WEIGHTS, parsed);
  } catch {
    return DEFAULT_FORMULA_WEIGHTS;
  }
}

export function saveFormulaWeights(w: FormulaWeights) {
  try {
    localStorage.setItem(KEY_FORMULA, JSON.stringify(w));
  } catch {}
}

// ---------------- Custom Sliders ----------------

export function loadCustomSliders(): CustomScoreSlider[] {
  try {
    const raw = localStorage.getItem(KEY_CUSTOM);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    // Minimal sanity checks
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        id: String(x.id ?? ""),
        name: String(x.name ?? "Untitled"),
        w: { ...(x.w ?? {}) },
      }))
      .filter((x) => x.id.length > 0);
  } catch {
    return [];
  }
}

export function saveCustomSliders(sliders: CustomScoreSlider[]) {
  try {
    localStorage.setItem(KEY_CUSTOM, JSON.stringify(sliders));
  } catch {}
}

// ---------------- Category Visibility ----------------

export function loadCategoryVisibility(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KEY_CATEGORY_VISIBILITY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, value !== false]));
  } catch {
    return {};
  }
}

export function saveCategoryVisibility(visibility: Record<string, boolean>) {
  try {
    localStorage.setItem(KEY_CATEGORY_VISIBILITY, JSON.stringify(visibility));
  } catch {}
}

export const DEFAULT_SETTINGS: AppSettings = {
  showEdgeLabels: true,
  highlightUnseenEnabled: true,
  notesEnabled: true,
  showWeightSuggestionsEnabled: true,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);

    return {
      showEdgeLabels: parsed?.showEdgeLabels !== false,
      highlightUnseenEnabled: parsed?.highlightUnseenEnabled !== false,
      notesEnabled: parsed?.notesEnabled !== false,
      showWeightSuggestionsEnabled: parsed?.showWeightSuggestionsEnabled !== false,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  } catch {}
}

// ---------------- helpers ----------------

function isObj(x: any) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function deepMerge<T>(base: T, patch: any): T {
  if (!isObj(base) || !isObj(patch)) return (patch ?? base) as T;

  const out: any = { ...(base as any) };
  for (const k of Object.keys(patch)) {
    out[k] = isObj(out[k]) ? deepMerge(out[k], patch[k]) : patch[k];
  }
  return out as T;
}
