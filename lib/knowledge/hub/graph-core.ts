import type { GraphEdge, GraphNode } from "@/lib/knowledge/hub/types";

const uniq = (values: string[]) => Array.from(new Set(values));

export function buildTagEdges(nodes: Pick<GraphNode, "id" | "topics">[], max: number): GraphEdge[] {
  const byTag = new Map<string, string[]>();
  nodes.forEach((node) => uniq(node.topics).forEach((tag) => byTag.set(tag, [...(byTag.get(tag) || []), node.id])));
  const shared = new Map<string, number>();
  byTag.forEach((ids) => {
    for (let i = 0; i < ids.length; i += 1) for (let j = i + 1; j < ids.length; j += 1) {
      const [a, b] = ids[i] < ids[j] ? [ids[i], ids[j]] : [ids[j], ids[i]];
      const key = `${a}:${b}`;
      shared.set(key, (shared.get(key) || 0) + 1);
    }
  });
  return Array.from(shared, ([key, weight]) => { const [source, target] = key.split(":"); return { source, target, kind: "tag" as const, weight }; })
    .sort((x, y) => y.weight - x.weight || x.source.localeCompare(y.source) || x.target.localeCompare(y.target))
    .slice(0, max);
}

export function countTags(nodes: Pick<GraphNode, "topics">[]) {
  const counts = new Map<string, number>();
  nodes.forEach((node) => uniq(node.topics).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ko"));
}
