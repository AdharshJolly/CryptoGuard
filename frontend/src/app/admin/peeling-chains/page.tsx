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
  AlertTriangle,
  Activity,
  Download,
  Search,
  Clock,
  Layers,
  ArrowRight,
  TrendingDown,
  Timer,
  Zap,
  Filter,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
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

interface HopDetail {
  from_wallet: string;
  to_wallet: string;
  amount: number;
  amount_formatted: string;
  peeled_amount: number;
  peeled_formatted: string;
  delay_hours: number;
  hop_number: number;
  crypto_symbol: string;
}

interface PeelingChain {
  chain_id: string;
  source_wallet: string;
  destination_wallet: string;
  chain_length: number;
  chain_wallets: string[];
  hops: HopDetail[];
  initial_amount: number;
  initial_amount_formatted: string;
  final_amount: number;
  final_amount_formatted: string;
  total_peeled: number;
  total_peeled_formatted: string;
  peel_percentage: number;
  suspicion_score: number;
  risk_level: string;
  avg_delay_hours: number;
  total_delay_hours: number;
  time_pattern: string;
  description: string;
}

interface DetectionData {
  chains: PeelingChain[];
  statistics: {
    total_chains: number;
    high_risk_chains: number;
    avg_chain_length: number;
    total_peeled_amount: number;
    total_peeled_formatted: string;
    avg_peel_percentage: number;
  };
  time_analysis: {
    avg_delay_hours: number;
    max_delay_hours: number;
    chains_with_delays: number;
    rapid_chains: number;
    delayed_chains: number;
  };
  message?: string;
}

export default function PeelingChainsPage() {
  const [data, setData] = useState<DetectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [filterTimePattern, setFilterTimePattern] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedChain, setExpandedChain] = useState<string | null>(null);

  const fetchDetectionData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await fetch(
        "http://localhost:5000/api/peeling-chains/detect",
      );
      if (!response.ok) throw new Error("Failed to fetch detection data");

      const result = await response.json();
      console.log("Peeling chain data received:", result);
      setData(result);
      setLastUpdate(new Date().toLocaleTimeString());

      if (result.chains.length === 0 && result.message) {
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
    downloadAnchorNode.setAttribute("download", "peeling-chains-analysis.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Filter chains
  const filteredChains =
    data?.chains.filter((chain) => {
      // Risk filter
      if (filterRisk !== "all" && chain.risk_level !== filterRisk) return false;

      // Time pattern filter
      if (
        filterTimePattern !== "all" &&
        chain.time_pattern !== filterTimePattern
      )
        return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          chain.source_wallet.toLowerCase().includes(query) ||
          chain.destination_wallet.toLowerCase().includes(query) ||
          chain.chain_id.toLowerCase().includes(query)
        );
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

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }
  };

  const getTimePatternIcon = (pattern: string) => {
    switch (pattern) {
      case "rapid":
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case "delayed":
        return <Timer className="w-4 h-4 text-blue-400" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getTimePatternLabel = (pattern: string) => {
    switch (pattern) {
      case "rapid":
        return "Rapid (<6h)";
      case "delayed":
        return "Delayed (>24h)";
      default:
        return "Normal";
    }
  };

  const formatWallet = (wallet: string) => {
    if (wallet.length > 16) {
      return `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
    }
    return wallet;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Layers className="w-8 h-8 text-teal-400" />
            Peeling Chain Detection
          </h1>
          <p className="text-zinc-500 mt-1 flex items-center gap-2">
            Detect peeling chains with gas fee analysis and time delay patterns
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
            disabled={!data || data.chains.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-300">
                What are Peeling Chains?
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Peeling chains are a money laundering technique where funds are
                moved through multiple wallets, with small amounts &ldquo;peeled
                off&rdquo; at each hop (typically as gas fees). Time delays
                between transactions are often introduced to hide the trail and
                avoid detection.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Total Chains</p>
                <p className="text-2xl font-bold text-white">
                  {data?.statistics.total_chains || 0}
                </p>
              </div>
              <div className="p-3 bg-teal-500/10 rounded-lg">
                <LinkIcon className="w-6 h-6 text-teal-400" />
              </div>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              Avg length: {data?.statistics.avg_chain_length || 0} hops
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">High Risk Chains</p>
                <p className="text-2xl font-bold text-red-400">
                  {data?.statistics.high_risk_chains || 0}
                </p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              {data?.statistics.total_chains
                ? (
                    ((data?.statistics.high_risk_chains || 0) /
                      data.statistics.total_chains) *
                    100
                  ).toFixed(0)
                : 0}
              % of total chains
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Total Peeled</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {data?.statistics.total_peeled_formatted || "0 BTC"}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <TrendingDown className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              Avg: {data?.statistics.avg_peel_percentage || 0}% per chain
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Avg Time Delay</p>
                <p className="text-2xl font-bold text-blue-400">
                  {data?.time_analysis.avg_delay_hours || 0}h
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-zinc-600 mt-2">
              Max: {data?.time_analysis.max_delay_hours || 0}h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Pattern Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Rapid Chains</p>
                <p className="text-xs text-zinc-500">
                  Completed in less than 6 hours
                </p>
              </div>
            </div>
            <p className="text-3xl font-bold text-yellow-400">
              {data?.time_analysis.rapid_chains || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-zinc-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Normal Chains</p>
                <p className="text-xs text-zinc-500">6-24 hours total time</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-zinc-300">
              {(data?.statistics.total_chains || 0) -
                (data?.time_analysis.rapid_chains || 0) -
                (data?.time_analysis.delayed_chains || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Timer className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Delayed Chains</p>
                <p className="text-xs text-zinc-500">More than 24 hours</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-400">
              {data?.time_analysis.delayed_chains || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">Filters:</span>
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by wallet or chain ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Risk Filter */}
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Time Pattern Filter */}
            <select
              value={filterTimePattern}
              onChange={(e) => setFilterTimePattern(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Time Patterns</option>
              <option value="rapid">Rapid (&lt;6h)</option>
              <option value="normal">Normal (6-24h)</option>
              <option value="delayed">Delayed (&gt;24h)</option>
            </select>

            <span className="text-sm text-zinc-500">
              Showing {filteredChains.length} of {data?.chains.length || 0}{" "}
              chains
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {errorMessage && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-yellow-300 font-medium">No Data Available</p>
              <p className="text-yellow-400/70 text-sm">{errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Peeling Chain List */}
      <div className="space-y-4">
        {filteredChains.map((chain, index) => (
          <Card
            key={chain.chain_id}
            className={`border ${getRiskColor(chain.risk_level)} transition-all duration-300 hover:border-teal-500/50`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                      chain.risk_level === "critical"
                        ? "bg-red-500/20 text-red-400"
                        : chain.risk_level === "high"
                          ? "bg-orange-500/20 text-orange-400"
                          : chain.risk_level === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <span className="font-mono text-sm text-zinc-400">
                        {chain.chain_id}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span>{chain.chain_length} hops</span>
                    </CardTitle>
                    <CardDescription className="text-zinc-500 flex items-center gap-2">
                      <span className="font-mono">
                        {formatWallet(chain.source_wallet)}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                      <span className="font-mono">
                        {formatWallet(chain.destination_wallet)}
                      </span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getRiskBadgeColor(chain.risk_level)}>
                    {chain.risk_level.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-lg">
                    {getTimePatternIcon(chain.time_pattern)}
                    <span className="text-xs text-zinc-400">
                      {getTimePatternLabel(chain.time_pattern)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {(chain.suspicion_score * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-zinc-500">Suspicion</div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-2">
              {/* Chain Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Initial Amount</p>
                  <p className="text-sm font-semibold text-white">
                    {chain.initial_amount_formatted}
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Final Amount</p>
                  <p className="text-sm font-semibold text-white">
                    {chain.final_amount_formatted}
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Total Peeled</p>
                  <p className="text-sm font-semibold text-yellow-400">
                    {chain.total_peeled_formatted} ({chain.peel_percentage}%)
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Total Time</p>
                  <p className="text-sm font-semibold text-blue-400">
                    {chain.total_delay_hours.toFixed(1)}h
                  </p>
                </div>
              </div>

              {/* Expand/Collapse Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full border border-zinc-700 hover:border-teal-500"
                onClick={() =>
                  setExpandedChain(
                    expandedChain === chain.chain_id ? null : chain.chain_id,
                  )
                }
              >
                {expandedChain === chain.chain_id ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Hide Hop Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show Hop Details ({chain.hops.length} hops)
                  </>
                )}
              </Button>

              {/* Expanded Hop Details */}
              {expandedChain === chain.chain_id && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm text-zinc-400 mb-2">
                    Hop-by-Hop Analysis:
                  </div>
                  {chain.hops.map((hop, hopIndex) => (
                    <div
                      key={hopIndex}
                      className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
                        {hop.hop_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-zinc-400 truncate">
                            {formatWallet(hop.from_wallet)}
                          </span>
                          <ArrowRight className="w-4 h-4 text-teal-400 flex-shrink-0" />
                          <span className="font-mono text-zinc-400 truncate">
                            {formatWallet(hop.to_wallet)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">
                          {hop.amount_formatted}
                        </div>
                        <div className="text-xs text-yellow-400">
                          -{hop.peeled_formatted} peeled
                        </div>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="flex items-center gap-1 text-blue-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-sm">
                            {hop.delay_hours.toFixed(1)}h
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* View in Visualization Button */}
                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/admin/visualization?wallet=${chain.source_wallet}`}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-teal-500/50 text-teal-400 hover:bg-teal-500/10"
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        View in Graph
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {!isLoading && filteredChains.length === 0 && !errorMessage && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-8 text-center">
              <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-400 mb-2">
                No Peeling Chains Found
              </h3>
              <p className="text-sm text-zinc-500">
                {filterRisk !== "all" || filterTimePattern !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Run wallet analysis from the Overview page to detect peeling chain patterns."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
