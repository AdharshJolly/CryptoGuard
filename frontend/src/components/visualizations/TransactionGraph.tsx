"use client";

import React, { useRef, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

interface GraphNode {
  id: string;
  group: number;
  val: number;
  label?: string;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const MOCK_DATA: GraphData = {
  nodes: [
    { id: "Wallet A", group: 1, val: 20, label: "Suspect" },
    { id: "Wallet B", group: 2, val: 10, label: "Mixer" },
    { id: "Wallet C", group: 2, val: 5 },
    { id: "Wallet D", group: 1, val: 5 },
    { id: "Exchange X", group: 3, val: 30, label: "CEX" },
    { id: "Wallet E", group: 1, val: 8 },
  ],
  links: [
    { source: "Wallet A", target: "Wallet B", value: 5 },
    { source: "Wallet B", target: "Wallet C", value: 2 },
    { source: "Wallet B", target: "Wallet D", value: 3 },
    { source: "Wallet C", target: "Exchange X", value: 2 },
    { source: "Wallet A", target: "Wallet E", value: 1 },
  ],
};

export function TransactionGraph({
  data = MOCK_DATA,
  height = 400,
}: {
  data?: GraphData;
  height?: number;
}) {
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ w: 800, h: height });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setDimensions({
            w: entry.contentRect.width,
            h: entry.contentRect.height || height,
          });
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => resizeObserver.disconnect();
    }
  }, [height]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg overflow-hidden border border-border bg-black/20"
      style={{ height }}
    >
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.w}
        height={dimensions.h}
        graphData={data}
        nodeLabel="id"
        nodeColor={(node: any) =>
          node.group === 1
            ? "#ef4444"
            : node.group === 2
              ? "#f59e0b"
              : "#3b82f6"
        }
        linkColor={() => "#52525b"}
        backgroundColor="#09090b"
        nodeRelSize={6}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={(d: any) => d.value * 0.001}
        cooldownTicks={100}
      />
    </div>
  );
}
