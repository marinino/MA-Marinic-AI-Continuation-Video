import type { Edge, Node, Project } from "@ma/shared";

export function getTopmostAncestor(
  selectedNodeId: string,
  project: Project,
  nodeMap: Map<string, Node>
): Node | null {
  const chain = getAncestorChainInclusive(selectedNodeId, project, nodeMap);
  return chain.length > 0 ? chain[0] : null;
}

export function buildNodeMap(project: Project): Map<string, Node> {
  return new Map(project.nodes.map((node) => [node.id, node]));
}

export function getIncomingEdge(nodeId: string, project: Project): Edge | null {
  return project.edges.find((edge) => edge.target === nodeId) ?? null;
}

export function getParentNode(
  node: Node,
  project: Project,
  nodeMap: Map<string, Node>
): Node | null {
  const incoming = getIncomingEdge(node.id, project);
  if (!incoming) return null;
  return nodeMap.get(incoming.source) ?? null;
}

export function getChildNodes(nodeId: string, project: Project): Node[] {
  const nodeMap = buildNodeMap(project);

  return project.edges
    .filter((edge) => edge.source === nodeId)
    .map((edge) => nodeMap.get(edge.target))
    .filter((node): node is Node => Boolean(node));
}

export function getAncestorChainInclusive(
  selectedNodeId: string,
  project: Project,
  nodeMap: Map<string, Node>
): Node[] {
  const chain: Node[] = [];
  let current = nodeMap.get(selectedNodeId) ?? null;

  while (current) {
    chain.push(current);
    current = getParentNode(current, project, nodeMap);
  }

  return chain.reverse();
}

export function getForwardChainInclusive(
  startNodeId: string,
  project: Project,
  nodeMap: Map<string, Node>
): Node[] {
  const chain: Node[] = [];
  let current = nodeMap.get(startNodeId) ?? null;

  while (current) {
    chain.push(current);

    const children = getChildNodes(current.id, project);

    if (children.length !== 1) break;

    current = children[0];
  }

  return chain;
}

export function getBranchPathThroughSelected(
  selectedNodeId: string,
  project: Project,
  nodeMap: Map<string, Node>
): Node[] {
  const ancestors = getAncestorChainInclusive(selectedNodeId, project, nodeMap);
  const forward = getForwardChainInclusive(selectedNodeId, project, nodeMap);

  return [...ancestors.slice(0, -1), ...forward];
}
