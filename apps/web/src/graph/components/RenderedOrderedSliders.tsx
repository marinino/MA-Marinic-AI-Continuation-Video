import { OrderedSliderItem, BuiltInCategoryId, CleanWeights } from "../types/ui";
import { CategorySlider } from "./CategorySlider";

export function renderOrderedSliderItem(
  item: OrderedSliderItem,
  computed: any,
  clipLogic: any,
  openWeights: (cat: any) => void,
  openCustomEdit: (id: string) => void,
  clickable: boolean,
  setCategoryScore?: (categoryId: BuiltInCategoryId, value: number) => void,
  setCustomCategoryScore?: (weights: CleanWeights, value: number) => void
) {
  if (item.kind === "base") {
    switch (item.id) {
      case "creativity":
        return (
          <CategorySlider
            label="Creativity"
            value={computed.scores.creativity}
            sx={clipLogic.catInfluenceSx("creativity", clipLogic.activeEffects)}
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
            value={computed.scores.promptFaithfulness}
            sx={clipLogic.catInfluenceSx("promptFaithfulness", clipLogic.activeEffects)}
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
            value={computed.scores.motion}
            sx={clipLogic.catInfluenceSx("motion", clipLogic.activeEffects)}
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
            value={computed.scores.transitionSmoothness}
            sx={clipLogic.catInfluenceSx("transitionSmoothness", clipLogic.activeEffects)}
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
            value={computed.scores.videoFaithfulness}
            sx={clipLogic.catInfluenceSx("videoFaithfulness", clipLogic.activeEffects)}
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
      value={computed.allScores[item.slider.id] ?? 0}
      onLabelClick={() => openCustomEdit(item.slider.id)}
      sx={clipLogic.catInfluenceSx(item.slider.id, clipLogic.activeEffects)}
      onChange={
        setCustomCategoryScore ? (v) => setCustomCategoryScore(item.slider.w, v) : undefined
      }
      readonly={!setCustomCategoryScore}
      clickable={clickable}
    />
  );
}
