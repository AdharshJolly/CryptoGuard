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
  RefreshCw,
  Download,
  Search,
  Filter,
  GitMerge,
  GitBranch,
  Layers,
  AlertTriangle,
  CircleDot,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Network,
  Activity,
  Eye,
  Info,
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
    : CRYPTO_CURRENCIES[0];
  const cryptoAmount = amount * crypto.rate;
  if (cryptoAmount >= 1000)
    return `${(cryptoAmount / 1000).toFixed(2)}K ${crypto.symbol}`;
  if (cryptoAmount >= 1) return `${cryptoAmount.toFixed(2)} ${crypto.symbol}`;
  return `${cryptoAmount.toFixed(4)} ${crypto.symbol}`;
};

interface GatherScatterPattern {
  pattern_id: string;
  scatter_wallet: string;
  gather_wallet: string;
  intermediaries: string[];
  intermediary_count: number;
  path_count: number;
  avg_path_length: number;
  num_layers: number;
  layer_category: string;
  total_volume: number;
  volume_formatted: string;
  scatter_out_degree: number;
  gather_in_degree: number;
  suspicion_score: number;
  risk_level: string;
  is_cyclic: boolean;
  pattern_type: string;
  description: string;
  sample_paths: Array<{
    path: string[];
    length: number;
    formatted: string;
  }>;
  scatter_wallet_data: {
    suspicion_score: number;
    total_sent: number;
  };
  gather_wallet_data: {
    suspicion_score: number;
    total_received: number;
  };
}

interface DetectionData {
  patterns: GatherScatterPattern[];
  statistics: {
    total_patterns: number;
    high_risk_patterns: number;
    total_wallets_involved: number;
    avg_layers: number;
    avg_intermediaries: number;
    total_volume: number;
    total_volume_formatted: string;
    cyclic_patterns: number;
  };
  layers_analysis: {
    two_layer_patterns: number;
    three_layer_patterns: number;
    complex_patterns: number;
  };
  risk_breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  message?: string;
}

export default function GatherScatterPage() {
  const [data, setData] = useState<DetectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [filterLayer, setFilterLayer] = useState<string>("all");
  const [filterCyclic, setFilterCyclic] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  const fetchDetectionData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await fetch(
        "http://localhost:5000/api/gather-scatter/detect",
      );
      if (!response.ok) throw new Error("Failed to fetch detection data");

      const result = await response.json();
      console.log("Gather-Scatter data received:", result);
      setData(result);
      setLastUpdate(new Date().toLocaleTimeString());

      if (result.patterns.length === 0 && result.message) {
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
    const exportData = {
      exported_at: new Date().toISOString(),
      patterns: data.patterns,
      statistics: data.statistics,
      layers_analysis: data.layers_analysis,
      risk_breakdown: data.risk_breakdown,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gather-scatter-patterns-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-red-400 bg-red-500/20 border-red-500/30";
      case "high":
        return "text-orange-400 bg-orange-500/20 border-orange-500/30";
      case "medium":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
      case "low":
        return "text-green-400 bg-green-500/20 border-green-500/30";
      default:
        return "text-zinc-400 bg-zinc-500/20 border-zinc-500/30";
    }
  };

  const getLayerColor = (category: string) => {
    switch (category) {
      case "Two-Layer":
        return "text-blue-400 bg-blue-500/20";
      case "Three-Layer":
        return "text-purple-400 bg-purple-500/20";
      case "Complex Multi-Layer":
        return "text-pink-400 bg-pink-500/20";
      default:
        return "text-zinc-400 bg-zinc-500/20";
    }
  };

  // Filter patterns
  const filteredPatterns =
    data?.patterns.filter((pattern) => {
      if (filterRisk !== "all" && pattern.risk_level !== filterRisk)
        return false;
      if (
        filterLayer !== "all" &&
        !pattern.layer_category.toLowerCase().includes(filterLayer)
      )
        return false;
      if (filterCyclic === "cyclic" && !pattern.is_cyclic) return false;
      if (filterCyclic === "non-cyclic" && pattern.is_cyclic) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          pattern.scatter_wallet.toLowerCase().includes(query) ||
          pattern.gather_wallet.toLowerCase().includes(query) ||
          pattern.pattern_id.toLowerCase().includes(query) ||
          pattern.intermediaries.some((i) => i.toLowerCase().includes(query))
        );
      }
      return true;
    }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <GitMerge className="w-8 h-8 text-purple-400" />
            Gather-Scatter Detection
          </h1>
          <p className="text-zinc-500 mt-1 flex items-center gap-2">
            Detect cyclic patterns where funds scatter through intermediaries
            and reconverge
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
            disabled={!data || data.patterns.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-purple-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-300">
                What are Gather-Scatter Patterns?
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Gather-Scatter (also known as Cyclic or Fan-Out/Fan-In) patterns
                are sophisticated money laundering techniques where:
              </p>
              <ul className="text-sm text-zinc-500 mt-2 space-y-1 list-disc list-inside">
                <li>
                  <span className="text-orange-400">Scatter Phase:</span> Source
                  wallet (A) sends funds to multiple intermediaries (B, C, D, E)
                </li>
                <li>
                  <span className="text-yellow-400">Layering Phase:</span>{" "}
                  Intermediaries pass funds through additional wallets (F, G, H)
                </li>
                <li>
                  <span className="text-green-400">Gather Phase:</span> All
                  paths reconverge at a final destination wallet (Z)
                </li>
                <li>
                  <span className="text-red-400">Cyclic Patterns:</span> Some
                  funds may loop back, creating circular flows to further
                  obscure the trail
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">Total Patterns</p>
                <p className="text-2xl font-bold text-white">
                  {data?.statistics.total_patterns || 0}
                </p>
              </div>
              <GitMerge className="h-8 w-8 text-purple-400 opacity-50" />
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              {data?.statistics.cyclic_patterns || 0} cyclic
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">High Risk</p>
                <p className="text-2xl font-bold text-red-400">
                  {data?.statistics.high_risk_patterns || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400 opacity-50" />
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              {data?.statistics.total_patterns
                ? Math.round(
                    ((data?.statistics.high_risk_patterns || 0) /
                      data.statistics.total_patterns) *
                      100,
                  )
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">Wallets Involved</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {data?.statistics.total_wallets_involved || 0}
                </p>
              </div>
              <Network className="h-8 w-8 text-cyan-400 opacity-50" />
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Avg {data?.statistics.avg_intermediaries || 0} intermediaries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">Total Volume</p>
                <p className="text-xl font-bold text-green-400">
                  {data?.statistics.total_volume_formatted || "0 BTC"}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-400 opacity-50" />
            </div>
            <p className="text-xs text-zinc-600 mt-1">Across all patterns</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">Avg Layers</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {data?.statistics.avg_layers || 0}
                </p>
              </div>
              <Layers className="h-8 w-8 text-yellow-400 opacity-50" />
            </div>
            <p className="text-xs text-zinc-600 mt-1">Hops per pattern</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-500 text-xs">Complex Patterns</p>
                <p className="text-2xl font-bold text-pink-400">
                  {data?.layers_analysis.complex_patterns || 0}
                </p>
              </div>
              <GitBranch className="h-8 w-8 text-pink-400 opacity-50" />
            </div>
            <p className="text-xs text-zinc-600 mt-1">4+ layer depth</p>
          </CardContent>
        </Card>
      </div>

      {/* Layer Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-xl font-bold text-blue-400">2</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {data?.layers_analysis.two_layer_patterns || 0}
                </p>
                <p className="text-sm text-zinc-400">Two-Layer Patterns</p>
                <p className="text-xs text-zinc-600">
                  Source → Intermediary → Destination
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="text-xl font-bold text-purple-400">3</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {data?.layers_analysis.three_layer_patterns || 0}
                </p>
                <p className="text-sm text-zinc-400">Three-Layer Patterns</p>
                <p className="text-xs text-zinc-600">Additional layering hop</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <span className="text-xl font-bold text-pink-400">4+</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {data?.layers_analysis.complex_patterns || 0}
                </p>
                <p className="text-sm text-zinc-400">Complex Multi-Layer</p>
                <p className="text-xs text-zinc-600">
                  Deep obfuscation attempts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Breakdown Bar */}
      {data && data.statistics.total_patterns > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-4 rounded-full overflow-hidden">
              <div
                className="bg-red-500"
                style={{
                  width: `${((data.risk_breakdown.critical || 0) / data.statistics.total_patterns) * 100}%`,
                }}
                title={`Critical: ${data.risk_breakdown.critical}`}
              />
              <div
                className="bg-orange-500"
                style={{
                  width: `${((data.risk_breakdown.high || 0) / data.statistics.total_patterns) * 100}%`,
                }}
                title={`High: ${data.risk_breakdown.high}`}
              />
              <div
                className="bg-yellow-500"
                style={{
                  width: `${((data.risk_breakdown.medium || 0) / data.statistics.total_patterns) * 100}%`,
                }}
                title={`Medium: ${data.risk_breakdown.medium}`}
              />
              <div
                className="bg-green-500"
                style={{
                  width: `${((data.risk_breakdown.low || 0) / data.statistics.total_patterns) * 100}%`,
                }}
                title={`Low: ${data.risk_breakdown.low}`}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Critical: {data.risk_breakdown.critical || 0}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                High: {data.risk_breakdown.high || 0}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                Medium: {data.risk_breakdown.medium || 0}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Low: {data.risk_breakdown.low || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">Filters:</span>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-600" />
              <input
                type="text"
                placeholder="Search by wallet or pattern ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={filterLayer}
              onChange={(e) => setFilterLayer(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Layer Depths</option>
              <option value="two">Two-Layer</option>
              <option value="three">Three-Layer</option>
              <option value="complex">Complex (4+)</option>
            </select>

            <select
              value={filterCyclic}
              onChange={(e) => setFilterCyclic(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Pattern Types</option>
              <option value="cyclic">Cyclic Only</option>
              <option value="non-cyclic">Non-Cyclic Only</option>
            </select>

            <span className="text-sm text-zinc-600">
              Showing {filteredPatterns.length} of{" "}
              {data?.statistics.total_patterns || 0} patterns
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {errorMessage && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="font-semibold text-yellow-400">No Data Available</p>
              <p className="text-sm text-zinc-400">{errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patterns List */}
      <div className="space-y-4">
        {filteredPatterns.map((pattern) => (
          <Card
            key={pattern.pattern_id}
            className={`bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all ${
              expandedPattern === pattern.pattern_id
                ? "ring-1 ring-purple-500/50"
                : ""
            }`}
          >
            <CardContent className="p-0">
              {/* Main Pattern Row */}
              <div
                className="p-4 cursor-pointer"
                onClick={() =>
                  setExpandedPattern(
                    expandedPattern === pattern.pattern_id
                      ? null
                      : pattern.pattern_id,
                  )
                }
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Pattern Icon */}
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        pattern.is_cyclic
                          ? "bg-pink-500/20"
                          : "bg-purple-500/20"
                      }`}
                    >
                      {pattern.is_cyclic ? (
                        <CircleDot className="h-6 w-6 text-pink-400" />
                      ) : (
                        <GitMerge className="h-6 w-6 text-purple-400" />
                      )}
                    </div>

                    {/* Pattern Info */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-zinc-400">
                          {pattern.pattern_id}
                        </span>
                        <Badge
                          className={`${getRiskColor(pattern.risk_level)} border`}
                        >
                          {pattern.risk_level.charAt(0).toUpperCase() +
                            pattern.risk_level.slice(1)}
                        </Badge>
                        <Badge
                          className={getLayerColor(pattern.layer_category)}
                        >
                          {pattern.layer_category}
                        </Badge>
                        {pattern.is_cyclic && (
                          <Badge className="bg-pink-500/20 text-pink-400">
                            Cyclic
                          </Badge>
                        )}
                      </div>

                      {/* Flow Visualization */}
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <span className="font-mono text-orange-400">
                          {pattern.scatter_wallet.slice(0, 10)}...
                        </span>
                        <ArrowRight className="h-4 w-4 text-zinc-500" />
                        <span className="text-zinc-400">
                          [{pattern.intermediary_count} intermediaries]
                        </span>
                        <ArrowRight className="h-4 w-4 text-zinc-500" />
                        <span className="font-mono text-green-400">
                          {pattern.gather_wallet.slice(0, 10)}...
                        </span>
                      </div>

                      <p className="text-xs text-zinc-500 mt-1">
                        {pattern.path_count} convergent paths • Avg{" "}
                        {pattern.avg_path_length} hops • Volume:{" "}
                        {pattern.volume_formatted}
                      </p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Scatter Degree</p>
                      <p className="text-lg font-bold text-orange-400">
                        {pattern.scatter_out_degree}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Gather Degree</p>
                      <p className="text-lg font-bold text-green-400">
                        {pattern.gather_in_degree}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">Suspicion</p>
                      <p
                        className={`text-lg font-bold ${
                          pattern.suspicion_score >= 0.7
                            ? "text-red-400"
                            : pattern.suspicion_score >= 0.5
                              ? "text-orange-400"
                              : "text-yellow-400"
                        }`}
                      >
                        {(pattern.suspicion_score * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/visualization?wallet=${pattern.scatter_wallet}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-zinc-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      {expandedPattern === pattern.pattern_id ? (
                        <ChevronUp className="h-5 w-5 text-zinc-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-zinc-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedPattern === pattern.pattern_id && (
                <div className="border-t border-zinc-800 p-4 bg-zinc-950">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sample Paths */}
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                        Sample Transaction Paths
                      </h4>
                      <div className="space-y-2">
                        {pattern.sample_paths.map((path, idx) => (
                          <div key={idx} className="p-3 bg-zinc-900 rounded-lg">
                            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                              <span className="font-semibold">
                                Path {idx + 1}
                              </span>
                              <span>• {path.length} hops</span>
                            </div>
                            <p className="font-mono text-xs text-zinc-300 break-all">
                              {path.formatted}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Intermediaries */}
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                        Intermediary Wallets ({pattern.intermediary_count})
                      </h4>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                        {pattern.intermediaries.map((wallet, idx) => (
                          <Link
                            key={idx}
                            href={`/admin/visualization?wallet=${wallet}`}
                          >
                            <Badge className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer font-mono text-xs">
                              {wallet.slice(0, 12)}...
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Wallet Details */}
                    <div className="lg:col-span-2">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Scatter Wallet */}
                        <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <GitBranch className="h-4 w-4 text-orange-400" />
                            <span className="text-sm font-semibold text-orange-400">
                              Scatter Source
                            </span>
                          </div>
                          <p className="font-mono text-xs text-zinc-300 truncate">
                            {pattern.scatter_wallet}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-zinc-400">
                            <span>
                              Suspicion:{" "}
                              {(
                                pattern.scatter_wallet_data.suspicion_score *
                                100
                              ).toFixed(0)}
                              %
                            </span>
                            <span>
                              Sent:{" "}
                              {formatCrypto(
                                pattern.scatter_wallet_data.total_sent,
                                pattern.scatter_wallet,
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Gather Wallet */}
                        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <GitMerge className="h-4 w-4 text-green-400" />
                            <span className="text-sm font-semibold text-green-400">
                              Gather Destination
                            </span>
                          </div>
                          <p className="font-mono text-xs text-zinc-300 truncate">
                            {pattern.gather_wallet}
                          </p>
                          <div className="flex gap-4 mt-2 text-xs text-zinc-400">
                            <span>
                              Suspicion:{" "}
                              {(
                                pattern.gather_wallet_data.suspicion_score * 100
                              ).toFixed(0)}
                              %
                            </span>
                            <span>
                              Received:{" "}
                              {formatCrypto(
                                pattern.gather_wallet_data.total_received,
                                pattern.gather_wallet,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {!isLoading && filteredPatterns.length === 0 && !errorMessage && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <GitMerge className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-400">
              No Patterns Found
            </h3>
            <p className="text-sm text-zinc-500 mt-2">
              {searchQuery || filterRisk !== "all" || filterLayer !== "all"
                ? "Try adjusting your filters or search query."
                : "Run wallet analysis from the Overview page to detect gather-scatter patterns."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 text-purple-400 mx-auto mb-4 animate-spin" />
            <p className="text-zinc-400">Loading gather-scatter patterns...</p>
          </CardContent>
        </Card>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <p className="text-xs text-zinc-500 text-center">
          Last updated: {lastUpdate}
        </p>
      )}
    </div>
  );
}
