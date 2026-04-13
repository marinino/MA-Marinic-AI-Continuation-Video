import { DEFAULT_FORMULA_WEIGHTS, DEFAULT_BASE_ORDER } from "../graph/graph_helpers/presets";
import { AppSettings, CustomScoreSlider, FormulaWeights } from "../graph/types/ui";

const KEY_FORMULA = "ma:v2v:formulaWeights:v1";
const KEY_CUSTOM = "ma:v2v:customScoreSliders:v1";
const KEY_CATEGORY_VISIBILITY = "ma:v2v:categoryVisibility:v1";
const KEY_SETTINGS = "ma:settings:v1";
const KEY_SLIDER_ORDER = "ma:v2v:sliderOrder:v1";
const KEY_PENTAGON_AXES = "ma:v2v:pentagonAxes:v1";
const KEY_TRIANGLE_AXES = "ma:v2v:triangleAxes:v1";

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

// ---------------- Custom Sliders Order ----------

export function saveCustomSliders(sliders: CustomScoreSlider[]) {
  try {
    localStorage.setItem(KEY_CUSTOM, JSON.stringify(sliders));
  } catch {}
}

export function loadSliderOrder(): string[] {
  try {
    const raw = localStorage.getItem("ma:v2v:sliderOrder:v1");
    if (!raw) return DEFAULT_BASE_ORDER;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_BASE_ORDER;
  } catch {
    return DEFAULT_BASE_ORDER;
  }
}

export function saveSliderOrder(order: string[]) {
  try {
    localStorage.setItem("ma:v2v:sliderOrder:v1", JSON.stringify(order));
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
  graphCardContentMode: "parameters",
  graphCardDisplayMode: "chips",
  restrictCategories: true,
  showOnlyChangedParameters: true,
  loopComparisonVideos: true,
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
      graphCardContentMode:
        parsed?.graphCardContentMode === "categories" ||
        parsed?.graphCardContentMode === "parameters"
          ? parsed.graphCardContentMode
          : DEFAULT_SETTINGS.graphCardContentMode,
      graphCardDisplayMode:
        parsed?.graphCardDisplayMode === "chips" || parsed?.graphCardDisplayMode === "bars"
          ? parsed.graphCardDisplayMode
          : DEFAULT_SETTINGS.graphCardDisplayMode,
      restrictCategories: parsed?.restrictCategories !== false,
      showOnlyChangedParameters: parsed?.showOnlyChangedParameters !== false,
      loopComparisonVideos: parsed?.loopComparisonVideos !== false,
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

export function normalizePentagonAxes(
  axes: string[],
  defaultAxes: string[],
  availableAxisIds: string[]
): string[] {
  return sanitizeAxes(axes, defaultAxes, availableAxisIds, 5);
}

export function loadPentagonAxes(defaultAxes: string[], availableAxisIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(KEY_PENTAGON_AXES);
    if (!raw) return sanitizeAxes(defaultAxes, defaultAxes, availableAxisIds, 5);

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return sanitizeAxes(defaultAxes, defaultAxes, availableAxisIds, 5);
    }

    return sanitizeAxes(parsed, defaultAxes, availableAxisIds, 5);
  } catch {
    return sanitizeAxes(defaultAxes, defaultAxes, availableAxisIds, 5);
  }
}

export function savePentagonAxes(
  axes: string[],
  defaultAxes: string[],
  availableAxisIds: string[]
) {
  try {
    const clean = sanitizeAxes(axes, defaultAxes, availableAxisIds, 5);
    localStorage.setItem(KEY_PENTAGON_AXES, JSON.stringify(clean));
  } catch {}
}

export function normalizeTriangleAxes(
  axes: string[],
  defaultAxes: string[],
  availableAxisIds: string[]
): string[] {
  return sanitizeAxes(axes, defaultAxes, availableAxisIds, 3);
}

export function loadTriangleAxes(defaultAxes: string[], availableAxisIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(KEY_TRIANGLE_AXES);
    if (!raw) return normalizeTriangleAxes(defaultAxes, defaultAxes, availableAxisIds);

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return normalizeTriangleAxes(defaultAxes, defaultAxes, availableAxisIds);
    }

    return normalizeTriangleAxes(parsed, defaultAxes, availableAxisIds);
  } catch {
    return normalizeTriangleAxes(defaultAxes, defaultAxes, availableAxisIds);
  }
}

export function saveTriangleAxes(
  axes: string[],
  defaultAxes: string[],
  availableAxisIds: string[]
) {
  try {
    const clean = normalizeTriangleAxes(axes, defaultAxes, availableAxisIds);
    localStorage.setItem(KEY_TRIANGLE_AXES, JSON.stringify(clean));
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

function sanitizeAxes(
  rawAxes: string[],
  defaultAxes: string[],
  availableAxisIds: string[],
  count: number
): string[] {
  const allowed = new Set(availableAxisIds);
  const used = new Set<string>();
  const result: string[] = [];

  for (const id of rawAxes) {
    if (typeof id !== "string") continue;
    if (!allowed.has(id)) continue;
    if (used.has(id)) continue;
    result.push(id);
    used.add(id);
    if (result.length === count) break;
  }

  for (const id of defaultAxes) {
    if (result.length === count) break;
    if (allowed.has(id) && !used.has(id)) {
      result.push(id);
      used.add(id);
    }
  }

  for (const id of availableAxisIds) {
    if (result.length === count) break;
    if (!used.has(id)) {
      result.push(id);
      used.add(id);
    }
  }

  return result.slice(0, count);
}
