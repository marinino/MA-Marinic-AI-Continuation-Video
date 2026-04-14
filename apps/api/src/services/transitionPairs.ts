import type { Project } from "@ma/shared";

export type TransitionPair = {
  parentClipId: string;
  paramsNodeId: string;
  childClipId: string;
};

export function getParamTransitionPairs(project: Project): TransitionPair[] {
  const nodeById = new Map(project.nodes.map((n) => [n.id, n]));
  const incomingByTarget = new Map<string, typeof project.edges>();

  for (const edge of project.edges) {
    const arr = incomingByTarget.get(edge.target) ?? [];
    arr.push(edge);
    incomingByTarget.set(edge.target, arr);
  }

  const pairs: TransitionPair[] = [];

  for (const node of project.nodes) {
    if (node.type !== "clip") continue;

    const incomingToChild = incomingByTarget.get(node.id) ?? [];

    for (const edgeToChild of incomingToChild) {
      const maybeParams = nodeById.get(edgeToChild.source);
      if (!maybeParams || maybeParams.type !== "params") continue;

      const incomingToParams = incomingByTarget.get(maybeParams.id) ?? [];
      const parentEdge = incomingToParams.find((e) => {
        const src = nodeById.get(e.source);
        return src?.type === "clip";
      });

      if (!parentEdge) continue;

      pairs.push({
        parentClipId: parentEdge.source,
        paramsNodeId: maybeParams.id,
        childClipId: node.id,
      });
    }
  }

  return pairs;
}