"use client";

import { useState, useEffect, useCallback } from "react";
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
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Download,
  Search,
  GitBranch,
  Filter,
} from "lucide-react";
import Link from "next/link";

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

// Get consistent crypto for a wallet address
const getCryptoForWallet = (walletAddress: string) => {
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    hash = (hash << 5) - hash + walletAddress.charCodeAt(i);
    hash |= 0;
  }
  return CRYPTO_CURRENCIES[Math.abs(hash) % CRYPTO_CURRENCIES.length];
};

// Format amount as crypto
const formatCrypto = (amount: number, walletAddress?: string) => {
  const crypto = walletAddress
    ? getCryptoForWallet(walletAddress)
    : CRYPTO_CURRENCIES[Math.floor(Math.random() * CRYPTO_CURRENCIES.length)];
  const cryptoAmount = amount * crypto.rate;
  if (cryptoAmount >= 1000)
    return `${(cryptoAmount / 1000).toFixed(2)}K ${crypto.symbol}`;
  if (cryptoAmount >= 1) return `${cryptoAmount.toFixed(2)} ${crypto.symbol}`;
  return `${cryptoAmount.toFixed(4)} ${crypto.symbol}`;
};

interface FanOutFanInStructure {
  wallet_address: string;
  structure_type: string;
  risk_level: string;
  suspicion_score: number;
  fan_out_score: number;
  fan_in_score: number;
  primary_metric: number;
  description: string;
  sources_count: number;
  destinations_count: number;
  sources: Array<{
    wallet: string;
    amount: number;
    transaction_count: number;
  }>;
  destinations: Array<{
    wallet: string;
    amount: number;
    transaction_count: number;
  }>;
  total_received: number;
  total_sent: number;
  volume: number;
  unique_counterparties: number;
  distance_to_illicit: number | null;
}

interface DetectionData {
  structures: FanOutFanInStructure[];
  statistics: {
    total_structures: number;
    high_risk_structures: number;
    total_wallets_involved: number;
    avg_fan_out: number;
    avg_fan_in: number;
    total_volume: number;
  };
  graph_metrics: {
    network_density: number;
    avg_clustering: number;
    connected_components: number;
    total_nodes: number;
    total_edges: number;
  };
  message?: string;
}

export default function GNNDetectionPage() {
  const [data, setData] = useState<DetectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedStructure, setExpandedStructure] = useState<number | null>(
    null,
  );

  const fetchDetectionData = useCallback(async () => {
    try {
      setErrorMessage("");
      const response = await fetch(
        "http://localhost:5000/api/fan-out-fan-in/detect",
      );
      if (!response.ok) throw new Error("Failed to fetch detection data");

      const result = await response.json();
      console.log("Detection data received:", result);
      setData(result);
      setLastUpdate(new Date().toLocaleTimeString());

      if (result.structures.length === 0 && result.message) {
        setErrorMessage(result.message);
      }
    } catch (error) {
      console.error("Error fetching detection data:", error);
      setErrorMessage(
        "Failed to connect to backend. Make sure Flask server is running on port 5000.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDetectionData();
  }, [fetchDetectionData]);

  const handleExport = () => {
    if (!data) return;
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      "fan-out-fan-in-detection.json",
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Filter structures
  const filteredStructures =
    data?.structures.filter((structure) => {
      // Type filter
      if (filterType !== "all") {
        if (
          filterType === "fan-out" &&
          !structure.structure_type.includes("Fan-Out")
        )
          return false;
        if (
          filterType === "fan-in" &&
          !structure.structure_type.includes("Fan-In")
        )
          return false;
        if (
          filterType === "layering" &&
          !structure.structure_type.includes("Layering")
        )
          return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        return structure.wallet_address
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      }

      return true;
    }) || [];

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500/10 border-red-500/30 text-red-400";
      case "high":
        return "bg-orange-500/10 border-orange-500/30 text-orange-400";
      case "medium":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
      default:
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    }
  };

  const getStructureIcon = (type: string) => {
    if (type.includes("Fan-Out")) return <TrendingUp className="w-4 h-4" />;
    if (type.includes("Fan-In")) return <TrendingDown className="w-4 h-4" />;
    return <GitBranch className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            GNN Fan-Out/Fan-In Detection
          </h1>
          <p className="text-zinc-500 mt-1 flex items-center gap-2">
            Graph Neural Network analysis for detecting smurfing structures
            {lastUpdate && (
              <>
                <span className="text-zinc-700">•</span>
                <span className="text-zinc-600">Updated: {lastUpdate}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700"
            onClick={fetchDetectionData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700"
            onClick={handleExport}
            disabled={!data || data.structures.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {data && data.structures.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Total Structures</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {data.statistics.total_structures}
                  </p>
                </div>
                <Network className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">High Risk</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">
                    {data.statistics.high_risk_structures}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Wallets Involved</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {data.statistics.total_wallets_involved}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Avg Fan-Out</p>
                  <p className="text-2xl font-bold text-orange-400 mt-1">
                    {(data.statistics.avg_fan_out * 100).toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">Avg Fan-In</p>
                  <p className="text-2xl font-bold text-cyan-400 mt-1">
                    {(data.statistics.avg_fan_in * 100).toFixed(1)}%
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graph Metrics */}
      {data && data.structures.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm">Graph Network Metrics</CardTitle>
            <CardDescription>Neural network analysis results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-zinc-500">Network Density</p>
                <p className="text-lg font-mono text-white mt-1">
                  {(data.graph_metrics.network_density * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-zinc-500">Avg Clustering</p>
                <p className="text-lg font-mono text-white mt-1">
                  {(data.graph_metrics.avg_clustering * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-zinc-500">Components</p>
                <p className="text-lg font-mono text-white mt-1">
                  {data.graph_metrics.connected_components}
                </p>
              </div>
              <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-zinc-500">Total Nodes</p>
                <p className="text-lg font-mono text-white mt-1">
                  {data.graph_metrics.total_nodes}
                </p>
              </div>
              <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-zinc-500">Total Edges</p>
                <p className="text-lg font-mono text-white mt-1">
                  {data.graph_metrics.total_edges}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {data && data.structures.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Search wallet address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Structures</option>
                <option value="fan-out">Fan-Out Only</option>
                <option value="fan-in">Fan-In Only</option>
                <option value="layering">Layering Only</option>
              </select>
              {(searchQuery || filterType !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-700"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterType("all");
                  }}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detected Structures */}
      {data && data.structures.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Network className="w-20 h-20 text-zinc-700 mb-4" />
            <h3 className="text-xl font-semibold text-zinc-400 mb-2">
              No Structures Detected
            </h3>
            <p className="text-sm text-zinc-600 max-w-md text-center mb-4">
              {errorMessage ||
                "No fan-out/fan-in structures found in analyzed wallets."}
            </p>
            <Link href="/admin/overview">
              <Button variant="default" size="sm" className="bg-blue-600">
                <Activity className="w-4 h-4 mr-2" />
                Go to Overview
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredStructures.map((structure, index) => (
            <Card
              key={index}
              className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStructureIcon(structure.structure_type)}
                    <div>
                      <CardTitle className="text-base">
                        {structure.structure_type}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        {structure.wallet_address.slice(0, 10)}...
                        {structure.wallet_address.slice(-8)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${getRiskColor(structure.risk_level)} border`}
                    >
                      {structure.risk_level.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="border-zinc-700">
                      {Math.round(structure.suspicion_score * 100)}% Risk
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Description */}
                  <p className="text-sm text-zinc-400">
                    {structure.description}
                  </p>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500">Fan-Out Score</p>
                      <p className="text-lg font-mono text-orange-400 mt-1">
                        {(structure.fan_out_score * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500">Fan-In Score</p>
                      <p className="text-lg font-mono text-cyan-400 mt-1">
                        {(structure.fan_in_score * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500">Sources</p>
                      <p className="text-lg font-mono text-white mt-1">
                        {structure.sources_count}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-zinc-500">Destinations</p>
                      <p className="text-lg font-mono text-white mt-1">
                        {structure.destinations_count}
                      </p>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t border-zinc-800">
                    <div>
                      <p className="text-xs text-zinc-500">Total Received</p>
                      <p className="text-sm font-mono text-emerald-400 mt-1">
                        {formatCrypto(
                          structure.total_received,
                          structure.wallet_address,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Total Sent</p>
                      <p className="text-sm font-mono text-red-400 mt-1">
                        {formatCrypto(
                          structure.total_sent,
                          structure.wallet_address,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">
                        Unique Counterparties
                      </p>
                      <p className="text-sm font-mono text-white mt-1">
                        {structure.unique_counterparties}
                      </p>
                    </div>
                  </div>

                  {/* Illicit Distance */}
                  {structure.distance_to_illicit !== null && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-xs text-red-400 font-medium">
                        ⚠️ Distance to illicit wallet:{" "}
                        {structure.distance_to_illicit} hops
                      </p>
                    </div>
                  )}

                  {/* Sources and Destinations */}
                  {expandedStructure === index && (
                    <div className="space-y-3 pt-3 border-t border-zinc-800">
                      {/* Sources */}
                      {structure.sources.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-500 font-medium mb-2">
                            Source Wallets ({structure.sources.length})
                          </p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {structure.sources.map((source, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 bg-zinc-800/50 rounded text-xs"
                              >
                                <span className="font-mono text-zinc-400">
                                  {source.wallet.slice(0, 8)}...
                                  {source.wallet.slice(-6)}
                                </span>
                                <div className="flex gap-2">
                                  <span className="text-emerald-400">
                                    {formatCrypto(source.amount, source.wallet)}
                                  </span>
                                  <span className="text-zinc-600">
                                    {source.transaction_count} tx
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Destinations */}
                      {structure.destinations.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-500 font-medium mb-2">
                            Destination Wallets ({structure.destinations.length}
                            )
                          </p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {structure.destinations.map((dest, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 bg-zinc-800/50 rounded text-xs"
                              >
                                <span className="font-mono text-zinc-400">
                                  {dest.wallet.slice(0, 8)}...
                                  {dest.wallet.slice(-6)}
                                </span>
                                <div className="flex gap-2">
                                  <span className="text-red-400">
                                    {formatCrypto(dest.amount, dest.wallet)}
                                  </span>
                                  <span className="text-zinc-600">
                                    {dest.transaction_count} tx
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t border-zinc-800">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-zinc-700 hover:border-purple-500"
                      onClick={() =>
                        setExpandedStructure(
                          expandedStructure === index ? null : index,
                        )
                      }
                    >
                      <GitBranch className="w-4 h-4 mr-2" />
                      {expandedStructure === index ? "Hide" : "Show"}{" "}
                      Connections
                    </Button>
                    <Link
                      href={`/admin/visualization?wallet=${structure.wallet_address}`}
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-zinc-700 hover:border-blue-500"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        View in Graph
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
