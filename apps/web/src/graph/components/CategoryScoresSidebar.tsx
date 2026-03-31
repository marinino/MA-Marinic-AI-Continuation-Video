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
  notesEnabled,
  note,
  onChangeNote,
  onSaveNote,
}: {
  open: boolean;
  onToggle: () => void;
  selectedNodeLabel?: string | null;
  orderedSliderItems: any[];
  computed: any | null;
  clipLogic: any;
  parameterItems: any[];
  parameterHistory: any;
  compareBaseNodeLabel?: string | null;
  notesEnabled?: boolean;
  note?: string;
  onChangeNote?: (value: string) => void;
  onSaveNote?: () => void;
}) {
  const [tab, setTab] = useState<SidebarTab>("categories");

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
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          pt: 1,
          borderRight: open ? "1px solid" : "none",
          borderColor: "divider",
        }}
      >
        <IconButton size="small" onClick={onToggle}>
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
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
              {selectedNodeLabel
                ? `Selected node: ${selectedNodeLabel}`
                : "No parameter node selected"}
            </Typography>
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
            ) : compareBaseNodeLabel ? (
              <CompareParameterBarGroup items={parameterItems} />
            ) : (
              <ParameterBarGroup
                items={parameterItems}
                history={parameterHistory}
                isFromChip={false}
              />
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
