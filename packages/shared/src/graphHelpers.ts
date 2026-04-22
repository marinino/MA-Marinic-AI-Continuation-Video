import { Edge, Project, Node } from "./schema";


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

function compareNodesByLowerPosition(a: Node, b: Node): number {
  const ay = a.position?.y ?? 0;
  const by = b.position?.y ?? 0;

  if (ay !== by) return by - ay; // weiter unten zuerst

  const ax = a.position?.x ?? 0;
  const bx = b.position?.x ?? 0;

  return bx - ax; // optional: weiter rechts zuerst
}

function getLowestChild(nodeId: string, project: Project): Node | null {
  const children = getChildNodes(nodeId, project);
  if (children.length === 0) return null;

  return [...children].sort(compareNodesByLowerPosition)[0] ?? null;
}

export function getForwardChainInclusive(
  startNodeId: string,
  project: Project,
  nodeMap: Map<string, Node>
): Node[] {
  const chain: Node[] = [];
  const visited = new Set<string>();

  let current = nodeMap.get(startNodeId) ?? null;

  while (current && !visited.has(current.id)) {
    chain.push(current);
    visited.add(current.id);

    const next = getLowestChild(current.id, project);
    if (!next) break;

    current = next;
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

// graphHelpers.ts
export function getBranchEdgeIds(
  branchPath: { id: string }[],
  project: Project
): Set<string> {
  const ids = new Set<string>();

  for (let i = 0; i < branchPath.length - 1; i++) {
    const sourceId = branchPath[i].id;
    const targetId = branchPath[i + 1].id;

    const edge = project.edges.find((e) => e.source === sourceId && e.target === targetId);
    if (edge) {
      ids.add(edge.id);
    }
  }

  return ids;
}

export function getBranchNodeIds(branchPath: { id: string }[]): Set<string> {
  return new Set(branchPath.map((node) => node.id));
}