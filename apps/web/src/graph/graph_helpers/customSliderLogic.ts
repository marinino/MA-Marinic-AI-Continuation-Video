import React from "react";
import { loadCustomSliders } from "../../utils/weightsStorage";
import { DEFAULT_CUSTOM_W, CustomScoreSlider } from "../hooks/useV2VParams";

export function customSliderLogic() {
  const [editOpen, setEditOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editW, setEditW] = React.useState(DEFAULT_CUSTOM_W);

  const [newOpen, setNewOpen] = React.useState(false);
  const [draftName, setDraftName] = React.useState("");
  const [draftW, setDraftW] = React.useState(DEFAULT_CUSTOM_W);

  const [customSliders, setCustomSliders] = React.useState<CustomScoreSlider[]>(() =>
    loadCustomSliders()
  );

  function deleteCustom(id: string) {
    setCustomSliders((prev) => prev.filter((x) => x.id !== id));
    setEditOpen(false);
    setEditId(null);
  }

  function openCustomEdit(id: string) {
    const cs = customSliders.find((x) => x.id === id);
    if (!cs) return;

    setEditId(id);
    setEditName(cs.name);
    setEditW(cs.w ?? DEFAULT_CUSTOM_W);
    setEditOpen(true);
  }

  function closeCustomEdit() {
    setEditOpen(false);
    setEditId(null);
  }

  function saveCustomEdit() {
    if (!editId) return;
    setCustomSliders((prev) =>
      prev.map((x) => (x.id === editId ? { ...x, name: editName.trim(), w: editW } : x))
    );
    setEditOpen(false);
    setEditId(null);
  }

  function createCustomSlider() {
    const id = `custom:${Date.now()}`;
    setCustomSliders((prev) => [...prev, { id, name: draftName.trim(), w: draftW }]);
    setNewOpen(false);
  }

  return {
    customSliders,
    setCustomSliders,

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

    deleteCustom,
    openCustomEdit,
    closeCustomEdit,
    saveCustomEdit,
    createCustomSlider,
  };
}
