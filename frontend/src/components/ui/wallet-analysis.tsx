"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  WalletSummary,
  WalletCentrality,
  SmurfingPattern,
  formatWalletAddress,
  formatCurrency,
  formatNumber,
  getRiskLevelFromScore,
  RISK_LEVEL_CONFIG,
} from "@/lib/api/crypto-types";
import { RiskBadge, RiskScoreGauge } from "./risk-indicators";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Network,
  Route,
  Users,
  AlertTriangle,
  Share2,
} from "lucide-react";

interface WalletSummaryCardProps {
  summary: WalletSummary;
  walletAddress: string;
  className?: string;
}

/**
 * Comprehensive wallet summary with all key metrics at a glance
 */
export function WalletSummaryCard({
  summary,
  walletAddress,
  className,
}: WalletSummaryCardProps) {
  const netFlow = summary.total_received - summary.total_sent;
  const isNetPositive = netFlow >= 0;

  return (
    <div
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded-xl p-6",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Wallet Overview</h3>
        <code className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">
          {formatWalletAddress(walletAddress, 10)}
        </code>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Received */}
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wide">
              Received
            </span>
          </div>
          <p className="text-xl font-bold text-emerald-400">
            {formatCurrency(summary.total_received)}
          </p>
        </div>

        {/* Total Sent */}
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-red-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wide">
              Sent
            </span>
          </div>
          <p className="text-xl font-bold text-red-400">
            {formatCurrency(summary.total_sent)}
          </p>
        </div>

        {/* Unique Senders */}
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wide">
              Senders
            </span>
          </div>
          <p className="text-xl font-bold text-white">
            {formatNumber(summary.unique_senders)}
          </p>
        </div>

        {/* Unique Receivers */}
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wide">
              Receivers
            </span>
          </div>
          <p className="text-xl font-bold text-white">
            {formatNumber(summary.unique_receivers)}
          </p>
        </div>
      </div>

      {/* Net Flow */}
      <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg mb-4">
        <span className="text-sm text-zinc-400">Net Flow</span>
        <span
          className={cn(
            "text-lg font-bold",
            isNetPositive ? "text-emerald-400" : "text-red-400",
          )}
        >
          {isNetPositive ? "+" : ""}
          {formatCurrency(netFlow)}
        </span>
      </div>

      {/* Distance to Illicit */}
      {summary.distance_to_illicit !== null && (
        <div
          className={cn(
            "flex items-center justify-between p-4 rounded-lg border",
            summary.distance_to_illicit <= 1
              ? "bg-red-500/10 border-red-500/30"
              : summary.distance_to_illicit <= 2
                ? "bg-orange-500/10 border-orange-500/30"
                : "bg-zinc-800/30 border-zinc-700",
          )}
        >
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-zinc-300">
              Distance to Known Illicit Wallet
            </span>
          </div>
          <span
            className={cn(
              "text-xl font-bold",
              summary.distance_to_illicit <= 1
                ? "text-red-400"
                : summary.distance_to_illicit <= 2
                  ? "text-orange-400"
                  : "text-zinc-300",
            )}
          >
            {summary.distance_to_illicit === 0
              ? "DIRECT"
              : `${summary.distance_to_illicit} hop${
                  summary.distance_to_illicit > 1 ? "s" : ""
                }`}
          </span>
        </div>
      )}
    </div>
  );
}

interface CentralityMetricsProps {
  centrality: WalletCentrality;
  className?: string;
}

/**
 * Network centrality metrics visualization with explanations
 */
export function CentralityMetrics({
  centrality,
  className,
}: CentralityMetricsProps) {
  const metrics = [
    {
      label: "Degree",
      value: centrality.degree,
      description: "How many wallets this wallet connects with",
      icon: Network,
    },
    {
      label: "Betweenness",
      value: centrality.betweenness,
      description: "How often this wallet lies on paths between other wallets",
      icon: Route,
    },
    {
      label: "PageRank",
      value: centrality.pagerank,
      description: "Overall importance in the network",
      icon: Share2,
    },
    {
      label: "Closeness",
      value: centrality.closeness,
      description: "Average distance to all other wallets",
      icon: Users,
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
        <Network className="w-4 h-4" />
        Network Centrality Analysis
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(({ label, value, description, icon: Icon }) => {
          const pct = Math.round(value * 100);
          const isHigh = value > 0.3;
          return (
            <div
              key={label}
              className={cn(
                "p-3 rounded-lg border",
                isHigh
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-zinc-800/50 border-zinc-700/50",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  className={cn(
                    "w-3.5 h-3.5",
                    isHigh ? "text-amber-400" : "text-zinc-500",
                  )}
                />
                <span className="text-xs font-medium text-zinc-300">
                  {label}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    isHigh ? "text-amber-400" : "text-white",
                  )}
                >
                  {pct}%
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
                {description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SmurfingPatternCardProps {
  pattern: SmurfingPattern;
  index: number;
  className?: string;
}

/**
 * Visual representation of a detected smurfing pattern
 */
export function SmurfingPatternCard({
  pattern,
  index,
  className,
}: SmurfingPatternCardProps) {
  const riskLevel = getRiskLevelFromScore(pattern.suspicion_score);
  const config = RISK_LEVEL_CONFIG[riskLevel];

  return (
    <div
      className={cn(
        "bg-zinc-900 border rounded-xl p-4",
        config.borderColor,
        className,
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              config.bgColor,
              config.color,
            )}
          >
            {index + 1}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Smurfing Pattern #{index + 1}
            </h4>
            <p className="text-xs text-zinc-500">
              {pattern.intermediaries.length} intermediary wallets
            </p>
          </div>
        </div>
        <RiskBadge level={riskLevel} />
      </div>

      {/* Path Visualization */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <div className="flex-shrink-0 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg">
          <span className="text-xs font-mono text-blue-400">
            {formatWalletAddress(pattern.source, 6)}
          </span>
          <p className="text-[10px] text-blue-500/70">Source</p>
        </div>
        {pattern.intermediaries.slice(0, 3).map((wallet, idx) => (
          <React.Fragment key={wallet}>
            <div className="text-zinc-600">→</div>
            <div className="flex-shrink-0 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-lg">
              <span className="text-xs font-mono text-amber-400">
                {formatWalletAddress(wallet, 6)}
              </span>
              <p className="text-[10px] text-amber-500/70">Hop {idx + 1}</p>
            </div>
          </React.Fragment>
        ))}
        {pattern.intermediaries.length > 3 && (
          <>
            <div className="text-zinc-600">→</div>
            <div className="flex-shrink-0 px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-500">
              +{pattern.intermediaries.length - 3} more
            </div>
          </>
        )}
        <div className="text-zinc-600">→</div>
        <div className="flex-shrink-0 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg">
          <span className="text-xs font-mono text-red-400">
            {formatWalletAddress(pattern.destination, 6)}
          </span>
          <p className="text-[10px] text-red-500/70">Destination</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 bg-zinc-800/50 rounded">
          <p className="text-lg font-bold text-white">
            {formatCurrency(pattern.metrics.total_amount)}
          </p>
          <p className="text-[10px] text-zinc-500">Total Amount</p>
        </div>
        <div className="text-center p-2 bg-zinc-800/50 rounded">
          <p className="text-lg font-bold text-white">
            {pattern.metrics.transaction_count}
          </p>
          <p className="text-[10px] text-zinc-500">Transactions</p>
        </div>
        <div className="text-center p-2 bg-zinc-800/50 rounded">
          <p className="text-lg font-bold text-white">
            {pattern.metrics.path_length}
          </p>
          <p className="text-[10px] text-zinc-500">Path Length</p>
        </div>
        <div className="text-center p-2 bg-zinc-800/50 rounded">
          <p className="text-lg font-bold text-white">
            {pattern.metrics.time_span_hours}h
          </p>
          <p className="text-[10px] text-zinc-500">Time Span</p>
        </div>
      </div>
    </div>
  );
}

interface BatchAnalysisSummaryProps {
  totalWallets: number;
  criticalRisk: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  className?: string;
}

/**
 * Summary of batch wallet analysis with live updates
 */
export function BatchAnalysisSummary({
  totalWallets,
  criticalRisk,
  highRisk,
  mediumRisk,
  lowRisk,
  className,
}: BatchAnalysisSummaryProps) {
  const criticalPct = Math.round((criticalRisk / totalWallets) * 100);
  
  // Animated counters for smooth transitions
  const [displayCriticalRisk, setDisplayCriticalRisk] = useState(criticalRisk);
  const [displayHighRisk, setDisplayHighRisk] = useState(highRisk);
  const [displayMediumRisk, setDisplayMediumRisk] = useState(mediumRisk);
  const [displayLowRisk, setDisplayLowRisk] = useState(lowRisk);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Animate counter changes
    const duration = 1000; // 1 second animation
    const steps = 30;
    const stepDuration = duration / steps;
    
    const criticalDiff = criticalRisk - displayCriticalRisk;
    const highDiff = highRisk - displayHighRisk;
    const mediumDiff = mediumRisk - displayMediumRisk;
    const lowDiff = lowRisk - displayLowRisk;
    
    if (criticalDiff !== 0 || highDiff !== 0 || mediumDiff !== 0 || lowDiff !== 0) {
      setIsUpdating(true);
      let currentStep = 0;
      
      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        
        setDisplayCriticalRisk(Math.round(displayCriticalRisk + criticalDiff * progress));
        setDisplayHighRisk(Math.round(displayHighRisk + highDiff * progress));
        setDisplayMediumRisk(Math.round(displayMediumRisk + mediumDiff * progress));
        setDisplayLowRisk(Math.round(displayLowRisk + lowDiff * progress));
        
        if (currentStep >= steps) {
          clearInterval(interval);
          setDisplayCriticalRisk(criticalRisk);
          setDisplayHighRisk(highRisk);
          setDisplayMediumRisk(mediumRisk);
          setDisplayLowRisk(lowRisk);
          setIsUpdating(false);
        }
      }, stepDuration);
      
      return () => clearInterval(interval);
    }
  }, [criticalRisk, highRisk, mediumRisk, lowRisk]);

  return (
    <div
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden",
        className,
      )}
    >
      {/* Live indicator */}
      <div className="absolute top-3 right-3">
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-1">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full bg-emerald-500",
            isUpdating ? "animate-pulse" : ""
          )} />
          <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide">
            Live
          </span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        Risk Distribution
      </h3>

      <div className="flex gap-1 h-4 rounded-full overflow-hidden mb-4 bg-zinc-800/50">
        <div
          className="bg-gradient-to-r from-purple-600 to-purple-700 transition-all duration-1000 ease-out shadow-lg shadow-purple-600/50"
          style={{ width: `${(criticalRisk / totalWallets) * 100}%` }}
        />
        <div
          className="bg-gradient-to-r from-red-500 to-red-600 transition-all duration-1000 ease-out shadow-lg shadow-red-500/50"
          style={{ width: `${(highRisk / totalWallets) * 100}%` }}
        />
        <div
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-1000 ease-out shadow-lg shadow-yellow-500/50"
          style={{ width: `${(mediumRisk / totalWallets) * 100}%` }}
        />
        <div
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1000 ease-out shadow-lg shadow-emerald-500/50"
          style={{ width: `${(lowRisk / totalWallets) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-3 bg-purple-600/10 rounded-lg border border-purple-600/30">
          <p className={cn(
            "text-2xl font-bold text-purple-400 tabular-nums transition-all duration-300",
            isUpdating && "scale-110"
          )}>
            {displayCriticalRisk}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Critical</p>
        </div>
        <div className="text-center p-3 bg-red-500/5 rounded-lg border border-red-500/20">
          <p className={cn(
            "text-2xl font-bold text-red-400 tabular-nums transition-all duration-300",
            isUpdating && "scale-110"
          )}>
            {displayHighRisk}
          </p>
          <p className="text-xs text-zinc-500 mt-1">High Risk</p>
        </div>
        <div className="text-center p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
          <p className={cn(
            "text-2xl font-bold text-yellow-400 tabular-nums transition-all duration-300",
            isUpdating && "scale-110"
          )}>
            {displayMediumRisk}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Medium Risk</p>
        </div>
        <div className="text-center p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
          <p className={cn(
            "text-2xl font-bold text-emerald-400 tabular-nums transition-all duration-300",
            isUpdating && "scale-110"
          )}>
            {displayLowRisk}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Low Risk</p>
        </div>
      </div>

      {criticalPct > 10 && (
        <div className="mt-4 p-3 bg-purple-600/15 border border-purple-600/40 rounded-lg text-sm text-purple-300 animate-pulse">
          🚨 {criticalPct}% of analyzed wallets are CRITICAL risk - immediate review
          required
        </div>
      )}
    </div>
  );
}
