import { useState } from "react";
import {
  Box,
  Collapse,
  IconButton,
  Tabs,
  Tab,
  Typography,
  TextField,
  Divider,
  Button,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { renderOrderedSliderItem } from "./RenderedOrderedSliders";
import { ParameterBarGroup } from "./ParameterBarGroup";
import { CompareParameterBarGroup } from "./CompareParameterBarGroup";
import { BrachSuggestion } from "../types/ui";

type SidebarTab = "categories" | "parameters";

export function CategoryScoresSidebar({
  open,
  onToggle,
  selectedNodeLabel,
  orderedSliderItems,
  computed,
  clipLogic,
  parameterItems,
  parameterHistory,
  compareBaseNodeLabel,
  prompt,
  notesEnabled,
  note,
  onChangeNote,
  onSaveNote,
  branchSuggestion,
  showWeightSuggestionsEnabled,
  selectedNodeType,
}: {
  open: boolean;
  onToggle: () => void;
  selectedNodeLabel?: string | null;
  selectedNodeType?: string | null;
  orderedSliderItems: any[];
  computed: any | null;
  clipLogic: any;
  parameterItems: any[];
  parameterHistory: any;
  compareBaseNodeLabel?: string | null;
  prompt?: string;
  notesEnabled?: boolean;
  note?: string;
  onChangeNote?: (value: string) => void;
  onSaveNote?: () => void;
  branchSuggestion?: BrachSuggestion | null;
  showWeightSuggestionsEnabled: boolean;
}) {
  const [tab, setTab] = useState<SidebarTab>("categories");

  console.log(selectedNodeType, "LABBBB");

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minWidth: 0,
        overflow: "hidden",
        display: "flex",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          width: 52,
          flexShrink: 0,
          height: "100%",
          position: "relative",
          borderRight: open ? "1px solid" : "none",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 0,
            width: "100%",
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <IconButton size="small" onClick={onToggle}>
            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>

        <Box
          onClick={onToggle}
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            cursor: "pointer",
            userSelect: "none",
            zIndex: 1,
          }}
        >
          <Typography
            sx={{
              transform: "rotate(-90deg)",
              transformOrigin: "center",
              whiteSpace: "nowrap",
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            {open ? "COLLAPSE" : "INSPECT PARAMETER NODE"}
          </Typography>
        </Box>
      </Box>

      {open && (
        <Box
          sx={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="subtitle2">Node inspection</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedNodeType === "params"
                ? `Selected node: ${selectedNodeLabel}`
                : "No parameter node selected"}
            </Typography>

            {selectedNodeType === "params" && prompt?.trim() && (
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                  Prompt
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {prompt}
                </Typography>
              </Box>
            )}
          </Box>

          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="fullWidth"
            sx={{ px: 1 }}
          >
            <Tab value="categories" label="Categories" />
            <Tab value="parameters" label="Parameters" />
          </Tabs>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              px: 2,
              py: 1.5,
            }}
          >
            {tab === "categories" ? (
              !computed ? (
                <Typography variant="body2" color="text.secondary">
                  Select a parameter node to inspect category scores.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.25,
                    width: "100%",
                    minWidth: 0,
                  }}
                >
                  {orderedSliderItems.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        width: "100%",
                        minWidth: 0,
                      }}
                    >
                      {renderOrderedSliderItem(
                        item,
                        computed,
                        clipLogic,
                        () => {},
                        () => {},
                        false,
                        () => {}
                      )}
                    </Box>
                  ))}
                </Box>
              )
            ) : parameterItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No parameter data available.
              </Typography>
            ) : (
              <ParameterBarGroup
                items={parameterItems}
                history={parameterHistory}
                isFromChip={false}
              />
            )}

            {showWeightSuggestionsEnabled && branchSuggestion && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>
                    Hint: Adjust weights
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {branchSuggestion.message}
                  </Typography>
                </Box>
              </>
            )}

            {notesEnabled && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                  <strong>Notes</strong>
                </Typography>

                <TextField
                  multiline
                  minRows={4}
                  fullWidth
                  value={note ?? ""}
                  onChange={(e) => onChangeNote?.(e.target.value)}
                  placeholder="Add notes for this node..."
                />

                <Button variant="outlined" size="small" onClick={onSaveNote} sx={{ mt: 1 }}>
                  Save notes
                </Button>
              </>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
