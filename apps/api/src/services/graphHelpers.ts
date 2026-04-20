import type { Node, Project } from "@ma/shared";

export function buildNodeMap(project: Project): Map<string, Node> {
  return new Map(project.nodes.map((node) => [node.id, node]));
}

export function getParentNode(node: Node, nodeMap: Map<string, Node>): Node | null {
  if (!node.parentId) return null;
  return nodeMap.get(node.parentId) ?? null;
}

export function getChildNodes(nodeId: string, project: Project): Node[] {
  return project.nodes.filter((node) => node.parentId === nodeId);
}

export function getAncestorChainInclusive(
  selectedNodeId: string,
  nodeMap: Map<string, Node>
): Node[] {
  const chain: Node[] = [];
  let current = nodeMap.get(selectedNodeId) ?? null;

  while (current) {
    chain.push(current);
    current = current.parentId ? (nodeMap.get(current.parentId) ?? null) : null;
  }

  return chain.reverse();
}

export function getTopmostAncestor(
  selectedNodeId: string,
  nodeMap: Map<string, Node>
): Node | null {
  const chain = getAncestorChainInclusive(selectedNodeId, nodeMap);
  return chain.length > 0 ? chain[0] : null;
}
