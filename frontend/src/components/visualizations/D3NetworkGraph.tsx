"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import {
  GraphNode,
  GraphEdge,
  GraphStatistics,
  VisualizeResponse,
  formatWalletAddress,
  formatCurrency,
  getRiskLevelFromScore,
} from "@/lib/api/crypto-types";
import { cn } from "@/lib/utils";

interface D3NetworkGraphProps {
  data: VisualizeResponse | null;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  className?: string;
}

interface SimulationNode extends GraphNode, d3.SimulationNodeDatum {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  value: number;
  label: string;
  transactions: number;
  width: number;
}

/**
 * D3.js Force-Directed Network Graph for Crypto Transaction Visualization
 *
 * Features:
 * - Force-directed layout
 * - Color-coded risk levels
 * - Interactive zoom/pan
 * - Node click callbacks
 * - Animated edges
 * - Tooltips
 */
export function D3NetworkGraph({
  data,
  height = 600,
  onNodeClick,
  className,
}: D3NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimulationNode | null>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height || height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height]);

  // D3 visualization
  useEffect(() => {
    if (!data || !svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

    // Create nodes and links from data
    const nodes: SimulationNode[] = data.nodes.map((n) => ({ ...n }));
    const links: SimulationLink[] = data.edges.map((e) => ({
      source: e.from,
      target: e.to,
      value: e.value,
      label: e.label,
      transactions: e.transactions,
      width: e.width,
    }));

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create main group for zoom/pan
    const g = svg.append("g");

    // Create defs for markers and gradients
    const defs = svg.append("defs");

    // Find the highlighted (main) wallet node
    const mainWallet = nodes.find((n) => n.highlighted);
    const mainWalletId = mainWallet?.id;

    // Define arrow markers for different flow directions
    // Green arrow for inflows to main wallet
    defs
      .append("marker")
      .attr("id", "arrowhead-inflow")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .append("path")
      .attr("d", "M 0,-5 L 10,0 L 0,5")
      .attr("fill", "#22c55e");

    // Orange arrow for outflows from main wallet
    defs
      .append("marker")
      .attr("id", "arrowhead-outflow")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .append("path")
      .attr("d", "M 0,-5 L 10,0 L 0,5")
      .attr("fill", "#f97316");

    // Gray arrow for other transactions
    defs
      .append("marker")
      .attr("id", "arrowhead-neutral")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .append("path")
      .attr("d", "M 0,-5 L 10,0 L 0,5")
      .attr("fill", "#71717a");

    // Create gradient definitions for edges
    links.forEach((link, i) => {
      const gradient = defs
        .append("linearGradient")
        .attr("id", `gradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse");
      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#3b82f6");
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#ef4444");
    });

    // Create force simulation
    const simulation = d3
      .forceSimulation<SimulationNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimulationNode, SimulationLink>(links)
          .id((d) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Create edges with color-coded direction
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: any) => {
        // Color code based on direction relative to main wallet
        if (mainWalletId) {
          if (d.target === mainWalletId || (typeof d.target === 'object' && d.target.id === mainWalletId)) {
            return "#22c55e"; // Green for inflows to main wallet
          } else if (d.source === mainWalletId || (typeof d.source === 'object' && d.source.id === mainWalletId)) {
            return "#f97316"; // Orange for outflows from main wallet
          }
        }
        return "#71717a"; // Gray for other transactions
      })
      .attr("stroke-opacity", (d: any) => {
        // Make main wallet transactions more visible
        if (mainWalletId) {
          const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
          const targetId = typeof d.target === 'object' ? d.target.id : d.target;
          if (sourceId === mainWalletId || targetId === mainWalletId) {
            return 0.9;
          }
        }
        return 0.5;
      })
      .attr("stroke-width", (d) => Math.min(d.width, 5))
      .attr("marker-end", (d: any) => {
        // Use different arrow markers based on direction
        if (mainWalletId) {
          if (d.target === mainWalletId || (typeof d.target === 'object' && d.target.id === mainWalletId)) {
            return "url(#arrowhead-inflow)";
          } else if (d.source === mainWalletId || (typeof d.source === 'object' && d.source.id === mainWalletId)) {
            return "url(#arrowhead-outflow)";
          }
        }
        return "url(#arrowhead-neutral)";
      });

    // Create edge labels
    const linkLabel = g
      .append("g")
      .attr("class", "link-labels")
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("font-size", "8px")
      .attr("fill", "#71717a")
      .attr("text-anchor", "middle")
      .text((d) => d.label);

    // Create node groups
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, SimulationNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimulationNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any,
      );

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => Math.max(8, d.size / 2))
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) => (d.highlighted ? "#fff" : "transparent"))
      .attr("stroke-width", (d) => (d.highlighted ? 3 : 0))
      .attr("filter", (d) => {
        const risk = getRiskLevelFromScore(d.suspicion_score);
        return risk === "critical" || risk === "high" ? "url(#glow)" : "";
      });

    // Add glow filter for high-risk nodes
    defs
      .append("filter")
      .attr("id", "glow")
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");

    // Node labels
    node
      .append("text")
      .attr("dy", (d) => Math.max(8, d.size / 2) + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", "#a1a1aa")
      .text((d) => d.label);

    // Node event handlers
    node.on("click", (event, d) => {
      event.stopPropagation();
      setSelectedNode(d.id);
      onNodeClick?.(d);
    });

    node.on("mouseover", (event, d) => {
      setHoveredNode(d);
      d3.select(event.currentTarget)
        .select("circle")
        .transition()
        .duration(200)
        .attr("r", (n: any) => Math.max(8, n.size / 2) + 4);
    });

    node.on("mouseout", (event, d) => {
      setHoveredNode(null);
      d3.select(event.currentTarget)
        .select("circle")
        .transition()
        .duration(200)
        .attr("r", (n: any) => Math.max(8, n.size / 2));
    });

    // Simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Background click to deselect
    svg.on("click", () => setSelectedNode(null));

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data, dimensions, onNodeClick]);

  if (!data) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800",
          className,
        )}
        style={{ height }}
      >
        <div className="text-zinc-500">Loading graph data...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-zinc-950 rounded-lg overflow-hidden",
        className,
      )}
      style={{ height }}
    >
      <svg ref={svgRef} width="100%" height="100%" className="block" />

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-3 border border-zinc-800">
        <h4 className="text-xs font-medium text-zinc-400 mb-2">Risk Levels</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-zinc-400">Low (0-40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-zinc-400">Medium (40-60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs text-zinc-400">High (60-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-zinc-400">Critical (80-100%)</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <h4 className="text-xs font-medium text-zinc-400 mb-2">Transaction Flow</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-4 h-0.5 bg-emerald-500" />
                <div className="w-0 h-0 border-l-4 border-l-emerald-500 border-y-4 border-y-transparent" />
              </div>
              <span className="text-xs text-zinc-400">Inflow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-4 h-0.5 bg-orange-500" />
                <div className="w-0 h-0 border-l-4 border-l-orange-500 border-y-4 border-y-transparent" />
              </div>
              <span className="text-xs text-zinc-400">Outflow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-4 h-0.5 bg-zinc-600" />
                <div className="w-0 h-0 border-l-4 border-l-zinc-600 border-y-4 border-y-transparent" />
              </div>
              <span className="text-xs text-zinc-400">Other</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {data.graph_statistics && (
        <div className="absolute top-4 right-4 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-3 border border-zinc-800">
          <h4 className="text-xs font-medium text-zinc-400 mb-2">
            Graph Stats
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-zinc-500">Nodes:</span>
            <span className="text-white font-medium">
              {data.graph_statistics.total_nodes}
            </span>
            <span className="text-zinc-500">Edges:</span>
            <span className="text-white font-medium">
              {data.graph_statistics.total_edges}
            </span>
            <span className="text-zinc-500">Illicit:</span>
            <span className="text-red-400 font-medium">
              {data.graph_statistics.illicit_nodes}
            </span>
            <span className="text-zinc-500">High Risk:</span>
            <span className="text-orange-400 font-medium">
              {data.graph_statistics.high_risk_nodes}
            </span>
          </div>
        </div>
      )}

      {/* Hovered Node Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 bg-zinc-900/95 backdrop-blur-sm rounded-lg p-4 border border-zinc-700 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: hoveredNode.color }}
            />
            <code className="text-sm text-white font-mono">
              {formatWalletAddress(hoveredNode.id, 8)}
            </code>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-zinc-500">Suspicion:</span>
            <span
              className={cn(
                "font-medium",
                hoveredNode.suspicion_score >= 0.6
                  ? "text-red-400"
                  : "text-zinc-300",
              )}
            >
              {Math.round(hoveredNode.suspicion_score * 100)}%
            </span>
            {hoveredNode.highlighted && (
              <>
                <span className="text-zinc-500">Status:</span>
                <span className="text-blue-400 font-medium">Highlighted</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 text-xs text-zinc-600">
        Scroll to zoom • Drag to pan • Click nodes for details
      </div>
    </div>
  );
}

// Wrapper with loading state
interface NetworkGraphWrapperProps extends D3NetworkGraphProps {
  loading?: boolean;
  error?: string | null;
}

export function NetworkGraphWrapper({
  loading,
  error,
  ...props
}: NetworkGraphWrapperProps) {
  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-800"
        style={{ height: props.height || 600 }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">
            Building network graph...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-zinc-950 rounded-lg border border-red-900/50"
        style={{ height: props.height || 600 }}
      >
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load graph</p>
          <p className="text-xs text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  return <D3NetworkGraph {...props} />;
}

export default D3NetworkGraph;
