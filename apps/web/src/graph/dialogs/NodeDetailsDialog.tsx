import { NodeDetailsDialogView } from "../components/NodeDetailsDialogView";
import { useNodeDetailsDialog } from "../hooks/useNodeDetailsDialogLogic";
import { NodeDetailsDialogProps } from "../types/props";
import { CategoryVisibilityDialog } from "./CategoryVisibilityDialog";

export function NodeDetailsDialog(props: NodeDetailsDialogProps) {
  const logic = useNodeDetailsDialog(props);

  return (
    <>
      <NodeDetailsDialogView props={props} logic={logic} />

      <CategoryVisibilityDialog
        open={!!logic.selectedCategory}
        category={logic.selectedCategory}
        onClose={logic.closeCategoryDialog}
        onHide={(categoryId) => props.onSetCategoryVisible?.(categoryId, false)}
      />
    </>
  );
}
