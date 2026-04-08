import * as React from "react";
import { Box, Button, Stack } from "@mui/material";
import { OrderedSliderItem, BuiltInCategoryId, CleanWeights } from "../types/ui";
import { CategorySlider } from "./CategorySlider";

type Props = {
  item: OrderedSliderItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  scores: Record<string, number>;
  allScores: Record<string, number>;
  activeEffects: Record<string, number> | null;
  catInfluenceSx: (cat: string, activeEffects: Record<string, number> | null) => any;
  openWeights: (cat: any) => void;
  openCustomEdit: (id: string) => void;
  clickable: boolean;
  moveSlider: (id: string, direction: "up" | "down") => void;
  setCategoryScore?: (categoryId: BuiltInCategoryId, value: number) => void;
  setCustomCategoryScore?: (weights: CleanWeights, value: number) => void;
};

export const OrderedSliderRow = React.memo(function OrderedSliderRow({
  item,
  isFirst,
  isLast,
  scores,
  allScores,
  activeEffects,
  catInfluenceSx,
  openWeights,
  openCustomEdit,
  clickable,
  moveSlider,
  setCategoryScore,
  setCustomCategoryScore,
}: Props) {
  const slider = React.useMemo(() => {
    if (item.kind === "base") {
      switch (item.id) {
        case "creativity":
          return (
            <CategorySlider
              label="Creativity"
              value={allScores.creativity ?? 0}
              sx={catInfluenceSx("creativity", activeEffects)}
              onLabelClick={() => openWeights("creativity")}
              onChange={setCategoryScore ? (v) => setCategoryScore("creativity", v) : undefined}
              readonly={!setCategoryScore}
              clickable={clickable}
            />
          );
        case "promptFaithfulness":
          return (
            <CategorySlider
              label="Prompt faithfulness"
              value={allScores.promptFaithfulness ?? 0}
              sx={catInfluenceSx("promptFaithfulness", activeEffects)}
              onLabelClick={() => openWeights("promptFaithfulness")}
              onChange={
                setCategoryScore ? (v) => setCategoryScore("promptFaithfulness", v) : undefined
              }
              readonly={!setCategoryScore}
              clickable={clickable}
            />
          );
        case "motion":
          return (
            <CategorySlider
              label="Motion"
              value={allScores.motion ?? 0}
              sx={catInfluenceSx("motion", activeEffects)}
              onLabelClick={() => openWeights("motion")}
              onChange={setCategoryScore ? (v) => setCategoryScore("motion", v) : undefined}
              readonly={!setCategoryScore}
              clickable={clickable}
            />
          );
        case "transitionSmoothness":
          return (
            <CategorySlider
              label="Transition Smoothness"
              value={allScores.transitionSmoothness ?? 0}
              sx={catInfluenceSx("transitionSmoothness", activeEffects)}
              onLabelClick={() => openWeights("transitionSmoothness")}
              onChange={
                setCategoryScore ? (v) => setCategoryScore("transitionSmoothness", v) : undefined
              }
              readonly={!setCategoryScore}
              clickable={clickable}
            />
          );
        case "videoFaithfulness":
          return (
            <CategorySlider
              label="Video Faithfulness"
              value={allScores.videoFaithfulness ?? 0}
              sx={catInfluenceSx("videoFaithfulness", activeEffects)}
              onLabelClick={() => openWeights("videoFaithfulness")}
              onChange={
                setCategoryScore ? (v) => setCategoryScore("videoFaithfulness", v) : undefined
              }
              readonly={!setCategoryScore}
              clickable={clickable}
            />
          );
      }
    }

    return (
      <CategorySlider
        label={item.slider.name}
        value={allScores[item.slider.id] ?? 0}
        onLabelClick={() => openCustomEdit(item.slider.id)}
        sx={catInfluenceSx(item.slider.id, activeEffects)}
        onChange={
          setCustomCategoryScore ? (v) => setCustomCategoryScore(item.slider.w, v) : undefined
        }
        readonly={!setCustomCategoryScore}
        clickable={clickable}
      />
    );
  }, [
    item,
    scores,
    allScores,
    activeEffects,
    catInfluenceSx,
    openWeights,
    openCustomEdit,
    clickable,
    setCategoryScore,
    setCustomCategoryScore,
  ]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 1,
        alignItems: "center",
      }}
    >
      <Box>{slider}</Box>

      <Stack spacing={0.5}>
        <Button
          size="small"
          variant="text"
          disabled={isFirst}
          onClick={() => moveSlider(item.id, "up")}
        >
          ↑
        </Button>
        <Button
          size="small"
          variant="text"
          disabled={isLast}
          onClick={() => moveSlider(item.id, "down")}
        >
          ↓
        </Button>
      </Stack>
    </Box>
  );
});
