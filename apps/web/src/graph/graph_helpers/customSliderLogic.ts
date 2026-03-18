import React from "react";
import { loadCustomSliders } from "../../utils/localStorage";
import { DEFAULT_CUSTOM_W } from "../hooks/useV2VParams";
import { CustomScoreSlider } from "../types/ui";

export function customSliderLogic() {
  const [editOpen, setEditOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editW, setEditW] = React.useState(DEFAULT_CUSTOM_W);

  const [newOpen, setNewOpen] = React.useState(false);
  const [draftName, setDraftName] = React.useState("");
  const [draftW, setDraftW] = React.useState(DEFAULT_CUSTOM_W);

  
  return {
    

    editOpen,
    editId,
    editName,
    editW,
    setEditName,
    setEditW,

    newOpen,
    draftName,
    draftW,
    setNewOpen,
    setDraftName,
    setDraftW,

   
  };
}
