"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { Share2 } from "lucide-react";
import { categoryHex } from "@/components/knowledge/hub/category-colors";
import type { GraphResponse } from "@/components/knowledge/hub/hub-client";
import type { GraphEdge } from "@/lib/knowledge/hub/types";

type Props = { graph: GraphResponse; activeId: string | null; onOpen: (id: string) => void };
type SimNode = SimulationNodeDatum & { id: string };
type SimLink = SimulationLinkDatum<SimNode> & { key: string; kind: GraphEdge["kind"]; weight: number };

const WIDTH = 1000;
const HEIGHT = 640;
const PAD = 24;
const edgeKey = (edge: Pick<GraphEdge, "kind" | "source" | "target">) => `${edge.kind}:${edge.source}:${edge.target}`;
const clamp = (value: number | undefined, max: number) => Math.max(PAD, Math.min(max - PAD, value ?? max / 2));

export default function KnowledgeGraphView({ graph, activeId, onOpen }: Props) {
  const [showTags, setShowTags] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const nodeRefs = useRef(new Map<string, SVGGElement>());
  const edgeRefs = useRef(new Map<string, SVGLineElement>());
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const view = useRef({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  const applyView = () => viewportRef.current?.setAttribute("transform", `translate(${view.current.x},${view.current.y}) scale(${view.current.k})`);
  const resetView = () => { view.current = { k: 1, x: 0, y: 0 }; applyView(); };
  /** 화면 픽셀 → viewBox 좌표 비율. */
  const unitsPerPixel = () => WIDTH / (svgRef.current?.getBoundingClientRect().width || WIDTH);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const scale = WIDTH / rect.width;
      const px = (event.clientX - rect.left) * scale; const py = (event.clientY - rect.top) * scale;
      const { k, x, y } = view.current;
      const nextK = Math.min(4, Math.max(0.4, k * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
      view.current = { k: nextK, x: px - ((px - x) / k) * nextK, y: py - ((py - y) / k) * nextK };
      viewportRef.current?.setAttribute("transform", `translate(${view.current.x},${view.current.y}) scale(${nextK})`);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [graph.nodes.length]);

  const edges = useMemo(() => graph.edges.filter((edge) => showTags || edge.kind === "link"), [graph.edges, showTags]);
  const colorOf = useMemo(() => new Map(graph.categories.map((category) => [category.id, categoryHex(category.color)])), [graph.categories]);
  const { degree, neighbors } = useMemo(() => {
    const degreeMap = new Map<string, number>();
    const neighborMap = new Map<string, Set<string>>();
    edges.forEach((edge) => {
      const add = (from: string, to: string) => { neighborMap.set(from, (neighborMap.get(from) || new Set()).add(to)); };
      add(edge.source, edge.target); add(edge.target, edge.source);
      const score = edge.kind === "link" ? 1 : 0.35;
      degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + score);
      degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + score);
    });
    return { degree: degreeMap, neighbors: neighborMap };
  }, [edges]);

  useEffect(() => {
    const simNodes: SimNode[] = graph.nodes.map((node) => ({ id: node.id }));
    const simLinks: SimLink[] = edges.map((edge) => ({ source: edge.source, target: edge.target, key: edgeKey(edge), kind: edge.kind, weight: edge.weight }));
    const simulation = forceSimulation(simNodes)
      .force("link", forceLink<SimNode, SimLink>(simLinks).id((node) => node.id).distance((link) => link.kind === "link" ? 70 : 120).strength((link) => link.kind === "link" ? 0.6 : Math.min(0.25, 0.05 * link.weight)))
      .force("charge", forceManyBody().strength(-140))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("x", forceX(WIDTH / 2).strength(0.04))
      .force("y", forceY(HEIGHT / 2).strength(0.06))
      .force("collide", forceCollide(16));
    simulation.on("tick", () => {
      simNodes.forEach((node) => {
        node.x = clamp(node.x, WIDTH); node.y = clamp(node.y, HEIGHT);
        nodeRefs.current.get(node.id)?.setAttribute("transform", `translate(${node.x.toFixed(1)},${node.y.toFixed(1)})`);
      });
      simLinks.forEach((link) => {
        const line = edgeRefs.current.get(link.key);
        const source = link.source as SimNode; const target = link.target as SimNode;
        if (!line) return;
        line.setAttribute("x1", String(source.x ?? 0)); line.setAttribute("y1", String(source.y ?? 0));
        line.setAttribute("x2", String(target.x ?? 0)); line.setAttribute("y2", String(target.y ?? 0));
      });
    });
    return () => { simulation.stop(); };
  }, [graph.nodes, edges]);

  if (!graph.nodes.length) {
    return <div className="border border-dashed border-[var(--cw-border)] bg-[var(--cw-panel)] px-6 py-16 text-center text-sm text-[var(--cw-muted)]"><Share2 className="mx-auto mb-3 h-6 w-6 text-[var(--cw-accent)]" />표시할 지식이 없습니다.</div>;
  }

  const focusId = hoverId || activeId;
  const focusSet = focusId ? neighbors.get(focusId) : undefined;
  const dimmed = (id: string) => Boolean(hoverId) && hoverId !== id && !neighbors.get(hoverId!)?.has(id);
  const showLabel = (id: string) => graph.nodes.length <= 40 || (degree.get(id) || 0) >= 2 || id === focusId || Boolean(focusSet?.has(id));

  return <div className="border border-[var(--cw-border)] bg-[var(--cw-panel)]">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--cw-border)] px-4 py-3 text-xs text-[var(--cw-muted)]">
      <span className="inline-flex items-center gap-1.5"><svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="var(--cw-accent)" strokeWidth="2" /></svg>확정 연결</span>
      <span className="inline-flex items-center gap-1.5"><svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="var(--cw-accent)" strokeWidth="1.5" strokeDasharray="4 3" /></svg>AI 제안</span>
      <label className="inline-flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={showTags} onChange={(e) => setShowTags(e.target.checked)} className="accent-[var(--cw-accent)]" />같은 태그 선</label>
      <span className="ml-auto">점 크기 = 연결 수 · 휠로 확대, 끌어서 이동{graph.truncated ? " · 최근 300건만 표시합니다." : ""}</span>
      <button type="button" onClick={resetView} className="border border-[var(--cw-border)] px-2 py-1 font-semibold text-[var(--cw-ink)]">맞춤</button>
    </div>
    <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full cursor-grab touch-none select-none active:cursor-grabbing" role="img" aria-label="지식 연결 그래프"
      onPointerDown={(e) => { if ((e.target as Element).closest("[role=button]")) return; drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const ratio = unitsPerPixel();
        view.current = { ...view.current, x: view.current.x + (e.clientX - drag.current.x) * ratio, y: view.current.y + (e.clientY - drag.current.y) * ratio };
        drag.current = { x: e.clientX, y: e.clientY };
        applyView();
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}>
      <g ref={viewportRef}>
      <g>
        {edges.map((edge) => {
          const faded = Boolean(hoverId) && edge.source !== hoverId && edge.target !== hoverId;
          return edge.kind === "link"
            ? <line key={edgeKey(edge)} ref={(el) => { if (el) edgeRefs.current.set(edgeKey(edge), el); else edgeRefs.current.delete(edgeKey(edge)); }} stroke="var(--cw-accent)" strokeWidth={edge.status === "accepted" ? 2 : 1.4} strokeDasharray={edge.status === "accepted" ? undefined : "5 4"} opacity={faded ? 0.1 : 0.85} />
            : <line key={edgeKey(edge)} ref={(el) => { if (el) edgeRefs.current.set(edgeKey(edge), el); else edgeRefs.current.delete(edgeKey(edge)); }} stroke="var(--cw-muted)" strokeWidth={Math.min(3, 0.6 + edge.weight * 0.5)} opacity={faded ? 0.04 : 0.22} />;
        })}
      </g>
      <g>
        {graph.nodes.map((node) => {
          const radius = 5 + Math.min(12, 2.4 * Math.sqrt(degree.get(node.id) || 0));
          const active = node.id === activeId;
          return <g key={node.id} ref={(el) => { if (el) nodeRefs.current.set(node.id, el); else nodeRefs.current.delete(node.id); }}
            role="button" tabIndex={0} aria-label={node.title} className="cursor-pointer outline-none" opacity={dimmed(node.id) ? 0.15 : 1}
            onClick={() => onOpen(node.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(node.id); } }}
            onMouseEnter={() => setHoverId(node.id)} onMouseLeave={() => setHoverId(null)} onFocus={() => setHoverId(node.id)} onBlur={() => setHoverId(null)}>
            <title>{node.title}{node.topics.length ? `\n${node.topics.map((topic) => `#${topic}`).join(" ")}` : ""}</title>
            <circle r={radius} fill={node.categoryId ? colorOf.get(node.categoryId) || categoryHex(null) : categoryHex(null)} stroke={active ? "var(--cw-ink)" : "var(--cw-panel)"} strokeWidth={active ? 3 : 1.5} />
            {showLabel(node.id) && <text x={radius + 4} y={4} fontSize={11} fill="var(--cw-body)" className="pointer-events-none">{node.title.length > 18 ? `${node.title.slice(0, 18)}…` : node.title}</text>}
          </g>;
        })}
      </g>
      </g>
    </svg>
  </div>;
}
