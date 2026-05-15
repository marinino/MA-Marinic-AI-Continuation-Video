import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MobileStepper,
  Stack,
  Typography,
} from "@mui/material";
import { KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material";
import { useState } from "react";
import intro from "../../pictures/intro.png";
import genDialog from "../../pictures/genDialog.png";
import leftSidebar from "../../pictures/leftSidebar.png";
import rightSidebar from "../../pictures/rightSidebar.png";
import timeline from "../../pictures/timeline.png";
import { InfoSlide } from "../types/ui";
import CompareIcon from "@mui/icons-material/Compare";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

type InformationDialogProps = {
  open: boolean;
  onClose: () => void;
};

const slides: InfoSlide[] = [
  {
    title: "Workflow graph",
    image: intro,
    content: (
      <Stack spacing={2}>
        <Typography variant="body1">
          The workflow graph visualizes the complete creative process.
        </Typography>

        <Typography variant="body2" color="text.secondary">
          It contains clips, generation steps, edit steps, and alternative branches. This allows
          exploring multiple continuations without losing previous results.
        </Typography>

        {/* ---- Node explanation ---- */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Node types
          </Typography>

          <Stack spacing={0.5}>
            <Typography variant="body2">
              <b>Root node</b> represent the unique starting clip of the tree.
            </Typography>
            <Typography variant="body2">
              <b>Clip nodes</b> represent video results.
            </Typography>
            <Typography variant="body2">
              <b>Parameter nodes</b> store generation settings.
            </Typography>
            <Typography variant="body2">
              <b>Edit nodes</b> represent external editing steps.
            </Typography>
            <Typography variant="body2">
              <b>Import nodes</b> represent imported videos by the user.
            </Typography>
          </Stack>
        </Box>

        {/* ---- Icons explanation ---- */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Node actions
          </Typography>

          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AddIcon fontSize="small" />
              <Typography variant="body2">Add node based on this clip</Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <VisibilityIcon fontSize="small" />
              <Typography variant="body2">Hide this node and its successors</Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <DeleteOutlineIcon fontSize="small" />
              <Typography variant="body2">Delete this node and its successors</Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <CompareIcon fontSize="small" />
              <Typography variant="body2">
                Compare this node to any other parameter node in the graph
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    ),
  },
  {
    title: "Generation Dialog",
    image: genDialog,
    content: (
      <Stack spacing={2}>
        <Typography variant="body1">
          New video continuations are created using the generation dialog.
        </Typography>

        <Typography variant="body2" color="text.secondary">
          It allows fine-grained control over the generation process and makes parameter changes
          directly visible in the graph.
        </Typography>

        {/* ---- Sliders ---- */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Parameter control
          </Typography>

          <Typography variant="body2">
            The sliders allow adjusting key generation parameters such as inference steps, guidance
            scale, or other model-specific settings.
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Small changes can lead to noticeably different results, enabling exploration of multiple
            variations.
          </Typography>
        </Box>

        {/* ---- Tabs ---- */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Multiple modes
          </Typography>

          <Typography variant="body2">
            The dialog provides a second tab for alternative generation modes (e.g. video-to-video
            or different pipelines).
          </Typography>

          <Typography variant="body2" color="text.secondary">
            This allows switching between different generation strategies without leaving the
            workflow.
          </Typography>
        </Box>

        {/* ---- Result ---- */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Result integration
          </Typography>

          <Typography variant="body2">
            Each generation creates a parameter node and a resulting clip node, making the process
            transparent and reproducible.
          </Typography>
        </Box>
      </Stack>
    ),
  },
  {
    title: "Parameter inspection",
    image: leftSidebar,
    content: (
      <Stack spacing={2}>
        <Typography variant="body1">
          The left sidebar provides contextual support for exploring and continuing the selected
          workflow branch.
        </Typography>

        <Typography variant="body2" color="text.secondary">
          It summarizes the current branch, suggests meaningful parameter variations, and helps
          users understand how previous settings influenced the generated results.
        </Typography>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Parameter suggestions
          </Typography>

          <Typography variant="body2">
            Parameter suggestions propose alternative settings for the next generation step, helping
            users explore different visual outcomes without manually tuning every value.
          </Typography>

          <Typography variant="body2" color="text.secondary">
            They support fast iteration by encouraging small, structured variations.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Parameter history
          </Typography>

          <Typography variant="body2">
            The parameter history shows the settings used along the selected branch, making it
            easier to trace how a result was created.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Selected node details
          </Typography>

          <Typography variant="body2">
            Depending on the selected node, the sidebar displays relevant information such as clip
            metadata, generation settings, or editing details.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Workflow guidance
          </Typography>

          <Typography variant="body2">
            The sidebar helps users explore alternatives, compare parameter choices, and continue
            the workflow from meaningful points in the graph.
          </Typography>
        </Box>
      </Stack>
    ),
  },
  {
    title: "Clip comparison",
    image: rightSidebar,
    content: (
      <Stack spacing={2}>
        <Typography variant="body1">
          The right sidebar supports detailed comparison between two selected video branches.
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Users can inspect two videos side by side and compare how different generation paths
          evolve step by step.
        </Typography>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Side-by-side video comparison
          </Typography>

          <Typography variant="body2">
            Two selected clips can be displayed next to each other, making visual differences
            between alternative continuations easier to evaluate.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Step-by-step timeline
          </Typography>

          <Typography variant="body2">
            The comparison can be inspected step by step along the selected paths, so users can
            understand where two branches start to differ.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Parameter inspection
          </Typography>

          <Typography variant="body2">
            For each step, the corresponding generation parameters can be reviewed, helping users
            relate visual changes to concrete parameter choices.
          </Typography>
        </Box>
      </Stack>
    ),
  },
  {
    title: "Timeline view",
    image: timeline,
    content: (
      <Stack spacing={2}>
        <Typography variant="body1">
          The timeline shows the selected branch as a compact sequence of clips.
        </Typography>

        <Typography variant="body2" color="text.secondary">
          It hides parameter and editing details and focuses on the temporal order of the video
          results.
        </Typography>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Branch selection
          </Typography>

          <Typography variant="body2">
            All clip nodes along the selected path are collected and displayed as a continuous
            sequence.
          </Typography>

          <Typography variant="body2" color="text.secondary">
            The corresponding branch is highlighted in the graph to provide clear visual context.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Path resolution
          </Typography>

          <Typography variant="body2">
            If multiple continuations exist, the timeline follows the deepest available path by
            default.
          </Typography>

          <Typography variant="body2" color="text.secondary">
            This ensures that the most complete continuation is shown without requiring manual
            selection.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Interaction
          </Typography>

          <Typography variant="body2">
            Clicking a timeline segment jumps directly to the corresponding clip node in the graph.
          </Typography>
        </Box>
      </Stack>
    ),
  },
];

export function InformationDialog({ open, onClose }: InformationDialogProps) {
  const [activeStep, setActiveStep] = useState(0);

  const current = slides[activeStep];
  const maxSteps = slides.length;
  const progress = ((activeStep + 1) / maxSteps) * 100;

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, maxSteps - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleClose = () => {
    setActiveStep(0);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: 600, // fixe Gesamthöhe
            maxHeight: "90vh",
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 3, pr: 6, position: "relative" }}>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
          }}
        >
          <CloseIcon />
        </IconButton>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{current.title}</Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            mt: 1.5,
            height: 6,
            borderRadius: 999,
          }}
        />
      </DialogTitle>

      <DialogContent>
        <Stack direction="row" spacing={3} sx={{ minHeight: 360 }}>
          {/* left image area */}
          <Box
            sx={{
              width: "33%",
              minWidth: 220,
              borderRadius: 2,
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {current.image ? (
              <Box
                component="img"
                src={current.image}
                alt={current.title}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Image placeholder
              </Typography>
            )}
          </Box>

          {/* right text area */}
          <Box sx={{ width: "67%", pr: 1 }}>{current.content}</Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          display: "flex",
          justifyContent: "space-between",
          px: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <MobileStepper
            variant="dots"
            steps={maxSteps}
            position="static"
            activeStep={activeStep}
            sx={{ bgcolor: "transparent", p: 0 }}
            nextButton={null}
            backButton={null}
          />

          <Typography variant="body2" color="text.secondary">
            {activeStep + 1}/{maxSteps}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<KeyboardArrowLeft />}
          >
            Back
          </Button>

          {activeStep === maxSteps - 1 ? (
            <Button variant="contained" size="small" onClick={handleClose}>
              Close
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={handleNext}
              endIcon={<KeyboardArrowRight />}
            >
              Next
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
