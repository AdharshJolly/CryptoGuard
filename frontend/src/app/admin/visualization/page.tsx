"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Network,
  Zap,
  Filter,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Maximize2,
  AlertTriangle,
  Shield,
  Activity,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  VisualizeResponse,
  GraphNode,
  formatWalletAddress,
  getRiskLevelFromScore,
  RISK_LEVEL_CONFIG,
} from "@/lib/api/crypto-types";
import { RiskBadge } from "@/components/ui/risk-indicators";
import { MOCK_GRAPH_DATA } from "@/lib/api/mock-data";

// Crypto currency definitions for formatting
const CRYPTO_CURRENCIES = [
  { symbol: "BTC", rate: 0.000025 },
  { symbol: "ETH", rate: 0.00035 },
  { symbol: "SOL", rate: 0.0055 },
  { symbol: "MATIC", rate: 1.25 },
  { symbol: "AVAX", rate: 0.028 },
  { symbol: "DOT", rate: 0.14 },
  { symbol: "LINK", rate: 0.065 },
  { symbol: "XRP", rate: 2.0 },
];

// Format volume as crypto
const formatCryptoVolume = (amount: number) => {
  // Use a mix of cryptos for volume display
  const crypto =
    CRYPTO_CURRENCIES[Math.floor(amount / 1000) % CRYPTO_CURRENCIES.length];
  const cryptoAmount = amount * crypto.rate;
  if (cryptoAmount >= 1000)
    return `${(cryptoAmount / 1000).toFixed(1)}K ${crypto.symbol}`;
  if (cryptoAmount >= 1) return `${cryptoAmount.toFixed(2)} ${crypto.symbol}`;
  return `${cryptoAmount.toFixed(4)} ${crypto.symbol}`;
};

// Dynamic import for D3 Network Graph
const D3NetworkGraph = dynamic(
  () =>
    import("@/components/visualizations/D3NetworkGraph").then((mod) => ({
      default: mod.D3NetworkGraph,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[700px] bg-zinc-950 animate-pulse rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">
            Building network graph...
          </span>
        </div>
      </div>
    ),
  },
);

export default function AdminVisualizationPage() {
  const searchParams = useSearchParams();
  const walletParam = searchParams.get("wallet");

  const [graphData, setGraphData] = useState<VisualizeResponse>({
    nodes: [],
    edges: [],
    graph_statistics: {
      total_nodes: 0,
      total_edges: 0,
      illicit_nodes: 0,
      high_risk_nodes: 0,
    },
  });
  const [patternStats, setPatternStats] = useState<any>(null);
  const [networkStats, setNetworkStats] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showHighRiskOnly, setShowHighRiskOnly] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [maxNodes, setMaxNodes] = useState<number>(50);
  const [searchQuery, setSearchQuery] = useState<string>(walletParam || "");

  const fetchGraphData = useCallback(async () => {
    try {
      setErrorMessage("");
      const response = await fetch(
        "http://localhost:5000/api/visualization/graph",
      );
      if (!response.ok) throw new Error("Failed to fetch graph data");

      const data = await response.json();
      console.log("Graph data received:", data);
      setGraphData(data);
      setLastUpdate(new Date().toLocaleTimeString());

      if (data.nodes.length === 0 && data.message) {
        setErrorMessage(data.message);
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
      setErrorMessage(
        "Failed to connect to backend. Make sure Flask server is running on port 5000.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPatternStats = useCallback(async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/visualization/patterns",
      );
      if (!response.ok) throw new Error("Failed to fetch pattern stats");

      const data = await response.json();
      console.log("Pattern stats received:", data);
      setPatternStats(data);
    } catch (error) {
      console.error("Error fetching pattern stats:", error);
    }
  }, []);

  const fetchNetworkStats = useCallback(async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/visualization/network-stats",
      );
      if (!response.ok) throw new Error("Failed to fetch network stats");

      const data = await response.json();
      console.log("Network stats received:", data);
      setNetworkStats(data);
    } catch (error) {
      console.error("Error fetching network stats:", error);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    await Promise.all([
      fetchGraphData(),
      fetchPatternStats(),
      fetchNetworkStats(),
    ]);
  }, [fetchGraphData, fetchPatternStats, fetchNetworkStats]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-select wallet node from URL parameter
  useEffect(() => {
    if (walletParam && graphData.nodes.length > 0 && !selectedNode) {
      const node = graphData.nodes.find((n) => n.id === walletParam);
      if (node) {
        setSelectedNode(node);
        // Increase max nodes to ensure wallet is visible
        if (maxNodes < 100) {
          setMaxNodes(100);
        }
      }
    }
  }, [walletParam, graphData.nodes, selectedNode, maxNodes]);

  // Auto-refresh only when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllData]);

  // Filter nodes based on settings
  const filteredData: VisualizeResponse = useMemo(() => {
    let filteredNodes = graphData.nodes;

    // If wallet parameter is present, show wallet's network subgraph
    if (walletParam && graphData.nodes.length > 0) {
      // Find the target wallet
      const targetWallet = graphData.nodes.find((n) => n.id === walletParam);
      if (targetWallet) {
        // Get all edges connected to this wallet
        const connectedEdges = graphData.edges.filter(
          (e) => e.from === walletParam || e.to === walletParam,
        );

        // Get all directly connected nodes (1 hop)
        const connectedNodeIds = new Set([walletParam]);
        connectedEdges.forEach((edge) => {
          connectedNodeIds.add(edge.from);
          connectedNodeIds.add(edge.to);
        });

        // Get 2nd hop connections (neighbors of neighbors) for richer context
        const secondHopEdges = graphData.edges.filter(
          (e) => connectedNodeIds.has(e.from) || connectedNodeIds.has(e.to),
        );
        secondHopEdges.forEach((edge) => {
          connectedNodeIds.add(edge.from);
          connectedNodeIds.add(edge.to);
        });

        // Filter nodes to only show connected nodes
        filteredNodes = graphData.nodes.filter((n) =>
          connectedNodeIds.has(n.id),
        );

        // If still too many nodes, prioritize by connection strength
        if (filteredNodes.length > 50) {
          // Count connections per node
          const nodeConnections = new Map<string, number>();
          graphData.edges.forEach((edge) => {
            nodeConnections.set(
              edge.from,
              (nodeConnections.get(edge.from) || 0) + 1,
            );
            nodeConnections.set(
              edge.to,
              (nodeConnections.get(edge.to) || 0) + 1,
            );
          });

          // Keep target wallet and top connected nodes
          filteredNodes = filteredNodes
            .filter((n) => n.id === walletParam) // Always keep target
            .concat(
              filteredNodes
                .filter((n) => n.id !== walletParam)
                .sort((a, b) => {
                  const aConn = nodeConnections.get(a.id) || 0;
                  const bConn = nodeConnections.get(b.id) || 0;
                  // Prioritize by connections, then by suspicion score
                  if (aConn !== bConn) return bConn - aConn;
                  return b.suspicion_score - a.suspicion_score;
                })
                .slice(0, 49),
            );
        }

        // Filter edges to only show connections between visible nodes
        const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
        const filteredEdges = graphData.edges.filter(
          (e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to),
        );

        return {
          ...graphData,
          nodes: filteredNodes,
          edges: filteredEdges,
          graph_statistics: {
            ...graphData.graph_statistics,
            total_nodes: filteredNodes.length,
            total_edges: filteredEdges.length,
            high_risk_nodes: graphData.graph_statistics?.high_risk_nodes || 0,
            illicit_nodes: graphData.graph_statistics?.illicit_nodes || 0,
          },
        };
      }
    }

    // Normal filtering when no wallet parameter
    // Apply risk filter
    if (showHighRiskOnly) {
      filteredNodes = filteredNodes.filter((n) => n.suspicion_score >= 0.6);
    }

    // Apply search filter
    if (searchQuery.trim() && !walletParam) {
      filteredNodes = filteredNodes.filter((n) =>
        n.id.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply node limit (prioritize high-risk nodes)
    if (filteredNodes.length > maxNodes && !walletParam) {
      filteredNodes = filteredNodes
        .sort((a, b) => b.suspicion_score - a.suspicion_score)
        .slice(0, maxNodes);
    }

    // Get node IDs for edge filtering
    const nodeIds = new Set(filteredNodes.map((n) => n.id));

    // Filter edges to only include connections between visible nodes
    const filteredEdges = graphData.edges.filter(
      (e) => nodeIds.has(e.from) && nodeIds.has(e.to),
    );

    return {
      ...graphData,
      nodes: filteredNodes,
      edges: filteredEdges,
      graph_statistics: {
        ...graphData.graph_statistics,
        total_nodes: filteredNodes.length,
        total_edges: filteredEdges.length,
        high_risk_nodes: graphData.graph_statistics?.high_risk_nodes || 0,
        illicit_nodes: graphData.graph_statistics?.illicit_nodes || 0,
      },
    };
  }, [graphData, showHighRiskOnly, searchQuery, maxNodes, walletParam]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  const handleExport = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(filteredData, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "transaction-graph.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {walletParam ? "Wallet Network View" : "Intelligence Center"}
          </h1>
          <p className="text-zinc-500 mt-1 flex items-center gap-2">
            {walletParam
              ? "Viewing transaction network for selected wallet"
              : "Interactive network visualization for forensic analysis"}
            {lastUpdate && (
              <>
                <span className="text-zinc-700">•</span>
                <span className="text-zinc-600">Updated: {lastUpdate}</span>
              </>
            )}
          </p>
          {walletParam && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Badge
                variant="default"
                className="bg-blue-500/20 text-blue-300 border-blue-500/30"
              >
                <Network className="w-3 h-3 mr-1" />
                Target: {formatWalletAddress(walletParam)}
              </Badge>
              <span className="text-zinc-600">
                Showing all connected nodes (1-2 hops)
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-blue-500 border-blue-500/20 bg-blue-500/10 px-3 py-1"
          >
            <Network className="w-3 h-3 mr-1" />
            {filteredData.nodes.length} /{" "}
            {graphData.graph_statistics?.total_nodes || 0} Nodes
          </Badge>
          {(filteredData.nodes.length <
            (graphData.graph_statistics?.total_nodes || 0) ||
            searchQuery) && (
            <Badge
              variant="outline"
              className="text-amber-500 border-amber-500/20 bg-amber-500/10 px-3 py-1"
            >
              <Filter className="w-3 h-3 mr-1" />
              Filtered
            </Badge>
          )}
          <Badge
            variant="outline"
            className="text-red-500 border-red-500/20 bg-red-500/10 px-3 py-1"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            {graphData.graph_statistics?.high_risk_nodes || 0} High Risk
          </Badge>
          {networkStats && (
            <Badge
              variant="outline"
              className="text-purple-500 border-purple-500/20 bg-purple-500/10 px-3 py-1"
            >
              <Zap className="w-3 h-3 mr-1" />
              {formatCryptoVolume(networkStats.total_volume)} Volume
            </Badge>
          )}
        </div>
      </div>

      {/* Controls */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search and Filters Row */}
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Search wallet address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={maxNodes}
                onChange={(e) => setMaxNodes(Number(e.target.value))}
                className="px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={25}>Show 25 nodes</option>
                <option value={50}>Show 50 nodes</option>
                <option value={100}>Show 100 nodes</option>
                <option value={200}>Show 200 nodes</option>
                <option value={999999}>Show all nodes</option>
              </select>
              {(searchQuery ||
                showHighRiskOnly ||
                maxNodes < graphData.nodes.length) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 hover:border-red-500 hover:text-red-400"
                  onClick={() => {
                    setSearchQuery("");
                    setShowHighRiskOnly(false);
                    setMaxNodes(50);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant={showHighRiskOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowHighRiskOnly(!showHighRiskOnly)}
                  className={
                    showHighRiskOnly
                      ? "bg-red-600 hover:bg-red-700"
                      : "border-zinc-700"
                  }
                >
                  {showHighRiskOnly ? (
                    <Eye className="w-4 h-4 mr-2" />
                  ) : (
                    <EyeOff className="w-4 h-4 mr-2" />
                  )}
                  {showHighRiskOnly
                    ? "Showing High Risk"
                    : "Show High Risk Only"}
                </Button>
                <Button variant="outline" size="sm" className="border-zinc-700">
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700"
                  onClick={fetchAllData}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                  />
                  {isLoading ? "Refreshing..." : "Refresh Data"}
                </Button>
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  className={
                    autoRefresh
                      ? "bg-green-600 hover:bg-green-700"
                      : "border-zinc-700"
                  }
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Auto-Refresh {autoRefresh ? "ON" : "OFF"}
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700"
                  onClick={handleExport}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Graph
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="border-zinc-700"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph - 3 columns */}
        <Card
          className={`bg-zinc-900 border-zinc-800 ${
            isFullscreen ? "lg:col-span-4" : "lg:col-span-3"
          }`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" />
              Transaction Flow Network
            </CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>
                Visualizing smurfing patterns and fund flows. Click on nodes for
                details.
              </span>
              {filteredData.nodes.length > 0 &&
                filteredData.nodes.length < graphData.nodes.length && (
                  <span className="text-amber-400 text-xs">
                    Showing {filteredData.nodes.length} of{" "}
                    {graphData.nodes.length} nodes
                  </span>
                )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {graphData.nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center min-h-[600px]">
                <Shield className="w-20 h-20 text-zinc-700 mb-4" />
                <h3 className="text-xl font-semibold text-zinc-400 mb-2">
                  No Network Data Available
                </h3>
                <p className="text-sm text-zinc-600 max-w-md mb-2">
                  {errorMessage ||
                    "The visualization page shows data from wallet analyses performed on the Overview page."}
                </p>

                {/* Instructions */}
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg max-w-lg">
                  <p className="text-sm text-blue-300 font-semibold mb-2">
                    📋 How to Populate Data:
                  </p>
                  <ol className="text-xs text-blue-200 text-left space-y-1 list-decimal list-inside">
                    <li>
                      Go to the <strong>Overview Dashboard</strong>
                    </li>
                    <li>
                      The simulation will automatically analyze wallets every 10
                      seconds
                    </li>
                    <li>Return here to see the network visualization</li>
                    <li>
                      OR manually analyze wallets using the batch-analyze
                      endpoint
                    </li>
                  </ol>
                </div>

                {errorMessage && errorMessage.includes("backend") && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg max-w-md">
                    <p className="text-sm text-red-400">
                      ⚠️ Backend Connection Error
                    </p>
                    <p className="text-xs text-red-300 mt-1">
                      Start the Flask server:{" "}
                      <code className="bg-black/30 px-2 py-0.5 rounded">
                        python app.py
                      </code>
                    </p>
                  </div>
                )}
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 hover:border-blue-500 hover:text-blue-400"
                    onClick={fetchAllData}
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                    />
                    {isLoading ? "Checking..." : "Refresh & Check"}
                  </Button>
                  <Link href="/admin/overview">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Go to Overview
                    </Button>
                  </Link>
                </div>

                {/* Debug Info */}
                <div className="mt-8 text-xs text-zinc-700">
                  Last checked: {lastUpdate || "Never"}
                </div>
              </div>
            ) : (
              <D3NetworkGraph
                data={filteredData}
                height={isFullscreen ? 800 : 600}
                onNodeClick={handleNodeClick}
              />
            )}
          </CardContent>
        </Card>

        {/* Side Panel - 1 column */}
        {!isFullscreen && (
          <div className="space-y-6">
            {/* Selected Node Details */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Node Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedNode ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">
                        Wallet Address
                      </p>
                      <code className="text-sm text-white break-all">
                        {formatWalletAddress(selectedNode.id, 10)}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Risk Level</span>
                      <RiskBadge
                        level={getRiskLevelFromScore(
                          selectedNode.suspicion_score,
                        )}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">
                        Suspicion Score
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              selectedNode.suspicion_score >= 0.8
                                ? "bg-red-500"
                                : selectedNode.suspicion_score >= 0.6
                                  ? "bg-orange-500"
                                  : selectedNode.suspicion_score >= 0.4
                                    ? "bg-yellow-500"
                                    : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${selectedNode.suspicion_score * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-mono text-white">
                          {Math.round(selectedNode.suspicion_score * 100)}%
                        </span>
                      </div>
                    </div>
                    {selectedNode.is_illicit && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-xs text-red-400 font-medium">
                          ⚠️ Known Illicit Wallet
                        </p>
                      </div>
                    )}
                    {selectedNode.highlighted && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-xs text-blue-400 font-medium">
                          🎯 Primary Investigation Target
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 text-center py-4">
                    Click on a node to view details
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Graph Statistics */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Network Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Total Nodes</span>
                    <span className="text-sm font-medium text-white">
                      {graphData.graph_statistics?.total_nodes || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Total Edges</span>
                    <span className="text-sm font-medium text-white">
                      {graphData.graph_statistics?.total_edges || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      High Risk Nodes
                    </span>
                    <span className="text-sm font-medium text-orange-400">
                      {graphData.graph_statistics?.high_risk_nodes || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Illicit Nodes</span>
                    <span className="text-sm font-medium text-red-400">
                      {graphData.graph_statistics?.illicit_nodes || 0}
                    </span>
                  </div>
                  {networkStats && (
                    <>
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                        <span className="text-xs text-zinc-500">
                          Network Density
                        </span>
                        <span className="text-sm font-medium text-cyan-400">
                          {(networkStats.network_density * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">
                          Avg Degree
                        </span>
                        <span className="text-sm font-medium text-blue-400">
                          {networkStats.average_degree}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">
                          Components
                        </span>
                        <span className="text-sm font-medium text-purple-400">
                          {networkStats.connected_components}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">
                          Avg Suspicion
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            networkStats.average_suspicion >= 0.7
                              ? "text-red-400"
                              : networkStats.average_suspicion >= 0.4
                                ? "text-yellow-400"
                                : "text-emerald-400"
                          }`}
                        >
                          {(networkStats.average_suspicion * 100).toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                  <div className="pt-3 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-2">
                      Risk Distribution
                    </p>
                    <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-red-500"
                        style={{
                          width: `${
                            (graphData.nodes.filter(
                              (n) => n.suspicion_score >= 0.8,
                            ).length /
                              graphData.nodes.length) *
                            100
                          }%`,
                        }}
                      />
                      <div
                        className="bg-orange-500"
                        style={{
                          width: `${
                            (graphData.nodes.filter(
                              (n) =>
                                n.suspicion_score >= 0.6 &&
                                n.suspicion_score < 0.8,
                            ).length /
                              graphData.nodes.length) *
                            100
                          }%`,
                        }}
                      />
                      <div
                        className="bg-yellow-500"
                        style={{
                          width: `${
                            (graphData.nodes.filter(
                              (n) =>
                                n.suspicion_score >= 0.4 &&
                                n.suspicion_score < 0.6,
                            ).length /
                              graphData.nodes.length) *
                            100
                          }%`,
                        }}
                      />
                      <div
                        className="bg-emerald-500"
                        style={{
                          width: `${
                            (graphData.nodes.filter(
                              (n) => n.suspicion_score < 0.4,
                            ).length /
                              graphData.nodes.length) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* High Risk Nodes List */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  High Risk Nodes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {graphData.nodes
                    .filter((n) => n.suspicion_score >= 0.6)
                    .sort((a, b) => b.suspicion_score - a.suspicion_score)
                    .slice(0, 5)
                    .map((node) => {
                      const config =
                        RISK_LEVEL_CONFIG[
                          getRiskLevelFromScore(node.suspicion_score)
                        ];
                      return (
                        <div
                          key={node.id}
                          className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                            selectedNode?.id === node.id
                              ? "border-blue-500 bg-blue-500/10"
                              : `${config.borderColor} ${config.bgColor}`
                          }`}
                          onClick={() => setSelectedNode(node)}
                        >
                          <div className="flex items-center justify-between">
                            <code className="text-xs text-zinc-300">
                              {node.label}
                            </code>
                            <span
                              className={`text-xs font-bold ${config.color}`}
                            >
                              {Math.round(node.suspicion_score * 100)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Pattern Summary */}
      {graphData.nodes.length > 0 && patternStats && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" />
              Detected Patterns Summary
            </CardTitle>
            <CardDescription>
              Real-time pattern detection from{" "}
              {graphData.graph_statistics?.total_nodes || 0} analyzed wallets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-orange-500/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Network className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {patternStats.smurfing_patterns}
                    </p>
                    <p className="text-xs text-zinc-500">Smurfing Patterns</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  Fan-out/fan-in structures detected
                </p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-purple-500/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Zap className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {patternStats.layering_chains}
                    </p>
                    <p className="text-xs text-zinc-500">Layering Chains</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  Multi-hop transaction sequences
                </p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-cyan-500/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {patternStats.rapid_movement}
                    </p>
                    <p className="text-xs text-zinc-500">Rapid Movement</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  High-velocity transactions
                </p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-blue-500/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Network className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {patternStats.mixing_hubs}
                    </p>
                    <p className="text-xs text-zinc-500">Mixing Hubs</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  High-centrality mixing nodes
                </p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-red-500/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {patternStats.circular_flows}
                    </p>
                    <p className="text-xs text-zinc-500">Circular Flows</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  Balanced in/out patterns
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
