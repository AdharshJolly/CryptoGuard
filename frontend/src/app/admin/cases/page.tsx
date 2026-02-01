"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  FileSearch,
  Zap,
  Network,
  TrendingUp,
  Filter,
  Plus,
  Shield,
} from "lucide-react";
import {
  WalletAnalysisResponse,
  formatWalletAddress,
  formatCurrency,
  getRiskLevelFromScore,
  RISK_LEVEL_CONFIG,
  RiskLevel,
} from "@/lib/api/crypto-types";
import { RiskBadge, RiskScoreGauge } from "@/components/ui/risk-indicators";

// Case data structure from API
interface CaseData {
  case_id: string;
  status: "New" | "Open" | "Investigating" | "Closed";
  primary_wallet: string;
  suspicion_score: number;
  patterns: {
    smurfing: number;
    peeling_chains: number;
  };
  distance_to_illicit: number | null;
  risk_indicators: string[];
  created_at: string;
  updated_at: string;
  laundering_pattern?: {
    pattern_type?: string;
    total_volume?: number;
    unique_counterparties?: number;
    token_types?: string[];
  };
}

const statusColors: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Open: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Investigating: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  Closed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const updated = new Date(timestamp);
  const diffMs = now.getTime() - updated.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function AdminCasesPage() {
  const [cases, setCases] = useState<CaseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    fetchCases();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchCases, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCases = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/cases');
      if (!response.ok) throw new Error('Failed to fetch cases');
      
      const data = await response.json();
      // Sort by suspicion score descending (highest risk first)
      const sortedCases = (data.cases || []).sort((a: CaseData, b: CaseData) => 
        b.suspicion_score - a.suspicion_score
      );
      setCases(sortedCases);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter cases by status
  const filteredCases = statusFilter === "All" 
    ? cases 
    : cases.filter((c) => c.status === statusFilter);

  const openCases = cases.filter((c) => c.status !== "Closed").length;
  const criticalCases = cases.filter((c) => c.suspicion_score >= 0.8).length;
  const totalSmurfing = cases.reduce(
    (sum, c) => sum + (c.patterns?.smurfing || 0),
    0,
  );
  const totalWallets = cases.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Investigation Board
          </h1>
          <p className="text-zinc-500 mt-1">
            Active AML investigations and case management
          </p>
        </div>
        <div className="relative">
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300"
            size="sm"
            onClick={() => setShowFilterMenu(!showFilterMenu)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter: {statusFilter}
          </Button>
          {showFilterMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg z-10">
              <div className="p-2">
                {["All", "New", "Open", "Investigating", "Closed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-800 transition-colors ${
                      statusFilter === status
                        ? "text-blue-400 bg-zinc-800"
                        : "text-zinc-300"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">
                  Open Cases
                </p>
                <p className="text-2xl font-bold text-white mt-1">
                  {openCases}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileSearch className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">
                  Critical Risk
                </p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {criticalCases}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingUp className="w-5 h-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">
                  Smurfing Patterns
                </p>
                <p className="text-2xl font-bold text-orange-400 mt-1">
                  {totalSmurfing}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Zap className="w-5 h-5 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">
                  Total Wallets
                </p>
                <p className="text-2xl font-bold text-white mt-1">
                  {totalWallets}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Network className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cases List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCases.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Shield className="w-16 h-16 text-zinc-700 mb-4" />
                <h3 className="text-lg font-semibold text-zinc-400 mb-2">
                  No Investigation Cases Found
                </h3>
                <p className="text-sm text-zinc-600 max-w-md">
                  Cases will appear here when high-risk wallets are flagged for investigation. Analyze wallets from the overview dashboard to create new cases.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredCases.map((c) => {
          const riskLevel = getRiskLevelFromScore(c.suspicion_score);
          const config = RISK_LEVEL_CONFIG[riskLevel];
          const patternType = c.laundering_pattern?.pattern_type || "Unknown";
          const totalVolume = c.laundering_pattern?.total_volume || 0;
          const counterparties = c.laundering_pattern?.unique_counterparties || 0;
          const tokenTypes = c.laundering_pattern?.token_types || ["ETH"];

          return (
            <Link key={c.case_id} href={`/admin/case/${c.case_id}`}>
              <Card
                className={`bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-all group cursor-pointer ${
                  c.suspicion_score >= 0.8 ? "ring-1 ring-red-500/20" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Section - Main Info */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Risk Score Circle */}
                      <div
                        className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center ${config.bgColor} border ${config.borderColor}`}
                      >
                        <span className={`text-2xl font-bold ${config.color}`}>
                          {Math.round(c.suspicion_score * 100)}
                        </span>
                        <span className="text-[10px] text-zinc-500">SCORE</span>
                      </div>

                      {/* Case Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                            {c.case_id}
                          </h3>
                          <Badge
                            className={`text-xs ${statusColors[c.status]}`}
                          >
                            {c.status}
                          </Badge>
                          <RiskBadge level={riskLevel} />
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 mb-3">
                          <span className="flex items-center gap-1">
                            <span className="text-zinc-600">Type:</span>
                            <span className="text-zinc-300">{patternType}</span>
                          </span>
                          <span className="text-zinc-700">•</span>
                          <span>{counterparties} Counterparties</span>
                          <span className="text-zinc-700">•</span>
                          <span>{formatCurrency(totalVolume)}</span>
                          <span className="text-zinc-700">•</span>
                          <span>{getTimeAgo(c.updated_at)}</span>
                        </div>

                        {/* Primary Wallet */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-zinc-600">
                            Primary Wallet:
                          </span>
                          <code className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                            {formatWalletAddress(c.primary_wallet, 8)}
                          </code>
                          {c.distance_to_illicit !== null && (
                            <Badge
                              className={
                                c.distance_to_illicit === 0
                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                  : c.distance_to_illicit <= 2
                                    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                    : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                              }
                            >
                              {c.distance_to_illicit === 0
                                ? "DIRECT ILLICIT"
                                : `${c.distance_to_illicit} hop${
                                    c.distance_to_illicit > 1 ? "s" : ""
                                  } to illicit`}
                            </Badge>
                          )}
                        </div>

                        {/* Risk Indicators */}
                        {c.risk_indicators.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {c.risk_indicators.map((indicator, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              >
                                ⚠ {indicator}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Metrics */}
                    <div className="flex items-center gap-6">
                      {/* Pattern Counts */}
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="px-3 py-2 bg-zinc-800/50 rounded-lg">
                          <p className="text-lg font-bold text-orange-400">
                            {c.patterns?.smurfing || 0}
                          </p>
                          <p className="text-[10px] text-zinc-500">Smurfing</p>
                        </div>
                        <div className="px-3 py-2 bg-zinc-800/50 rounded-lg">
                          <p className="text-lg font-bold text-purple-400">
                            {c.patterns?.peeling_chains || 0}
                          </p>
                          <p className="text-[10px] text-zinc-500">Peeling</p>
                        </div>
                      </div>

                      {/* Token Types */}
                      <div className="flex flex-col gap-1">
                        {tokenTypes.map((token) => (
                          <Badge
                            key={token}
                            variant="outline"
                            className={`text-xs ${
                              ["XMR", "ZEC", "DASH"].includes(token)
                                ? "border-red-500/30 text-red-400"
                                : ["USDT", "USDC", "DAI"].includes(token)
                                  ? "border-blue-500/30 text-blue-400"
                                  : "border-zinc-600 text-zinc-400"
                            }`}
                          >
                            {token}
                          </Badge>
                        ))}
                      </div>

                      <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })
        )}
      </div>
    </div>
  );
}
