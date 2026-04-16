import {
  Box,
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { GraphCardContentMode, GraphCardDisplayMode } from "../graph/types/ui";
import { BooleanToggleRow } from "../graph/components/BooleanToggleRow";

type SettingsProps = {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  showEdgeLabels: boolean;
  setShowEdgeLabels: (value: boolean) => void;
  highlightUnseenEnabled: boolean;
  setHighlightUnseenEnabled: (value: boolean) => void;
  notesEnabled: boolean;
  setNotesEnabled: (value: boolean) => void;
  setShowWeightSuggestionsEnabled: (value: boolean) => void;
  showWeightSuggestionsEnabled: boolean;
  graphCardContentMode: GraphCardContentMode;
  setGraphCardContentMode: (value: GraphCardContentMode) => void;
  graphCardDisplayMode: GraphCardDisplayMode;
  setGraphCardDisplayMode: (value: GraphCardDisplayMode) => void;
  restrictCategories: boolean;
  setRestrictCategories: (value: boolean) => void;
  showOnlyChangedParameters: boolean;
  setShowOnlyChangedParameters: (value: boolean) => void;
  loopComparisonVideos: boolean;
  setLoopComparisonVideos: (value: boolean) => void;
    showOnlyGeneratedPart: boolean;
  setShowOnlyGeneratedPart: (value: boolean) => void;
};

export function Settings({
  settingsOpen,
  setSettingsOpen,
  showEdgeLabels,
  setShowEdgeLabels,
  highlightUnseenEnabled,
  setHighlightUnseenEnabled,
  notesEnabled,
  setNotesEnabled,
  setShowWeightSuggestionsEnabled,
  showWeightSuggestionsEnabled,
  graphCardContentMode,
  setGraphCardContentMode,
  graphCardDisplayMode,
  setGraphCardDisplayMode,
  restrictCategories,
  setRestrictCategories,
  showOnlyChangedParameters,
  setShowOnlyChangedParameters,
  loopComparisonVideos,
  setLoopComparisonVideos,
  showOnlyGeneratedPart,
  setShowOnlyGeneratedPart
}: SettingsProps) {
  return (
    <Dialog
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      maxWidth="lg"
      fullWidth
      sx={{ borderRadius: 2 }}
    >
      <DialogTitle>Settings</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Display
        </Typography>

        <BooleanToggleRow
          label="Show edge labels"
          description="Shows the type of the edge via a label on it"
          value={showEdgeLabels}
          onChange={setShowEdgeLabels}
        />

        <BooleanToggleRow
          label="Highlight unseen nodes"
          description="Clip nodes that have not been opened yet are highlighted with a glowing border"
          value={highlightUnseenEnabled}
          onChange={setHighlightUnseenEnabled}
        />

        <BooleanToggleRow
          label="Show notes for nodes"
          description="When this in on you can add notes to every node, which are then shown in the graph and in the detailed node view"
          value={notesEnabled}
          onChange={setNotesEnabled}
        />

        <BooleanToggleRow
          label="Show suggestions for category weights"
          description="If a certain category value has a trend inside a branch the system makes suggestions to change the weight for this category"
          value={showWeightSuggestionsEnabled}
          onChange={setShowWeightSuggestionsEnabled}
        />

        <BooleanToggleRow
          label="Restict categories for pentagon and trinagle"
          description="When enabled the categories which are displayed in the pentagon and triangle can not be choosen freely and will be disabled if the selection is not deemed meaningful"
          value={restrictCategories}
          onChange={setRestrictCategories}
        />

        <BooleanToggleRow
          label="Only show the changed parameters in the graph"
          description="When enabled the nodes in the graph will only show the parameters that have changed from their parent node"
          value={showOnlyChangedParameters}
          onChange={setShowOnlyChangedParameters}
        />

        <BooleanToggleRow
          label="Loop videos in comparison sidebar"
          description="When enabled, video previews in the clip comparison sidebar play continuously in a loop"
          value={loopComparisonVideos}
          onChange={setLoopComparisonVideos}
        />

        <BooleanToggleRow
          label="Only show new clip snippets"
          description="When enabled, clip nodes show only the newly generated part after parameter node"
          value={showOnlyGeneratedPart}
          onChange={setShowOnlyGeneratedPart}
        />

        <Box
          sx={{
            mt: 1.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", maxWidth: "70%" }}>
            <Typography>Chips on graph cards</Typography>

            <Typography variant="caption" color="text.secondary">
              This settings changes what type of information is display on the graph nodes
            </Typography>
          </Box>

          <ButtonGroup
            variant="contained"
            sx={{
              boxShadow: "none",
              "& .MuiButton-root:first-of-type": {
                borderTopLeftRadius: 100,
                borderBottomLeftRadius: 100,
              },
              "& .MuiButton-root:last-of-type": {
                borderTopRightRadius: 100,
                borderBottomRightRadius: 100,
              },
            }}
          >
            <Button
              disableElevation
              variant={graphCardContentMode === "parameters" ? "contained" : "outlined"}
              onClick={() => setGraphCardContentMode("parameters")}
            >
              Parameters
            </Button>

            <Button
              disableElevation
              variant={graphCardContentMode === "categories" ? "contained" : "outlined"}
              onClick={() => setGraphCardContentMode("categories")}
            >
              Categories
            </Button>
          </ButtonGroup>
        </Box>

        <Box
          sx={{
            mt: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", maxWidth: "70%" }}>
            <Typography>Graph card style</Typography>

            <Typography variant="caption" color="text.secondary">
              Choose whether graph cards display values as chips or bars
            </Typography>
          </Box>

          <ButtonGroup
            variant="contained"
            sx={{
              boxShadow: "none",
              "& .MuiButton-root:first-of-type": {
                borderTopLeftRadius: 100,
                borderBottomLeftRadius: 100,
              },
              "& .MuiButton-root:last-of-type": {
                borderTopRightRadius: 100,
                borderBottomRightRadius: 100,
              },
            }}
          >
            <Button
              disableElevation
              variant={graphCardDisplayMode === "chips" ? "contained" : "outlined"}
              onClick={() => setGraphCardDisplayMode("chips")}
            >
              Chips
            </Button>

            <Button
              disableElevation
              variant={graphCardDisplayMode === "bars" ? "contained" : "outlined"}
              onClick={() => setGraphCardDisplayMode("bars")}
            >
              Bars
            </Button>
          </ButtonGroup>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setSettingsOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
