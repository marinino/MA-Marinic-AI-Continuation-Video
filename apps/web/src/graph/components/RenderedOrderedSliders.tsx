import { OrderedSliderItem } from "../types/ui";
import { ReadonlySlider } from "./ReadOnlySlider";

export function renderOrderedSliderItem(
  item: OrderedSliderItem,
  computed: any,
  clipLogic: any,
  openWeights: (cat: any) => void,
  openCustomEdit: (id: string) => void
) {
  if (item.kind === "base") {
    switch (item.id) {
      case "creativity":
        return (
          <ReadonlySlider
            label="Creativity"
            value={computed.scores.creativity}
            sx={clipLogic.catInfluenceSx("creativity", clipLogic.activeEffects)}
            onLabelClick={() => openWeights("creativity")}
          />
        );

      case "promptFaithfulness":
        return (
          <ReadonlySlider
            label="Prompt faithfulness"
            value={computed.scores.promptFaithfulness}
            sx={clipLogic.catInfluenceSx("promptFaithfulness", clipLogic.activeEffects)}
            onLabelClick={() => openWeights("promptFaithfulness")}
          />
        );

      case "motion":
        return (
          <ReadonlySlider
            label="Motion"
            value={computed.scores.motion}
            sx={clipLogic.catInfluenceSx("motion", clipLogic.activeEffects)}
            onLabelClick={() => openWeights("motion")}
          />
        );

      case "transitionSmoothness":
        return (
          <ReadonlySlider
            label="Transition Smoothness"
            value={computed.scores.transitionSmoothness}
            sx={clipLogic.catInfluenceSx("transitionSmoothness", clipLogic.activeEffects)}
            onLabelClick={() => openWeights("transitionSmoothness")}
          />
        );

      case "videoFaithfulness":
        return (
          <ReadonlySlider
            label="Video Faithfulness"
            value={computed.scores.videoFaithfulness}
            sx={clipLogic.catInfluenceSx("videoFaithfulness", clipLogic.activeEffects)}
            onLabelClick={() => openWeights("videoFaithfulness")}
          />
        );
    }
  }

  return (
    <ReadonlySlider
      label={item.slider.name}
      value={computed.allScores[item.slider.id] ?? 0}
      onLabelClick={() => openCustomEdit(item.slider.id)}
      sx={clipLogic.catInfluenceSx(item.slider.id, clipLogic.activeEffects)}
    />
  );
}
