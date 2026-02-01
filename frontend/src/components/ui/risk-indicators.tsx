"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  RiskLevel,
  RISK_LEVEL_CONFIG,
  getRiskLevelFromScore,
} from "@/lib/api/crypto-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";

interface RiskScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showPercentage?: boolean;
  className?: string;
}

/**
 * Visual gauge showing risk score from 0-1
 * Self-explanatory with color coding and optional labels
 */
export function RiskScoreGauge({
  score,
  size = "md",
  showLabel = true,
  showPercentage = true,
  className,
}: RiskScoreGaugeProps) {
  const riskLevel = getRiskLevelFromScore(score);
  const config = RISK_LEVEL_CONFIG[riskLevel];
  const percentage = Math.round(score * 100);

  const sizeConfig = {
    sm: { width: 80, height: 8, textSize: "text-xs" },
    md: { width: 120, height: 12, textSize: "text-sm" },
    lg: { width: 200, height: 16, textSize: "text-base" },
  };

  const { width, height, textSize } = sizeConfig[size];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className={cn("font-medium", textSize, config.color)}>
            {config.label}
          </span>
          {showPercentage && (
            <span className={cn("font-mono", textSize, "text-zinc-400")}>
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div
        className="bg-zinc-800 rounded-full overflow-hidden"
        style={{ width, height }}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            riskLevel === "low" && "bg-emerald-500",
            riskLevel === "medium" && "bg-yellow-500",
            riskLevel === "high" && "bg-orange-500",
            riskLevel === "critical" && "bg-red-500",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

/**
 * Colored badge indicating risk level
 */
export function RiskBadge({ level, className }: RiskBadgeProps) {
  const config = RISK_LEVEL_CONFIG[level];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        config.color,
        config.bgColor,
        config.borderColor,
        className,
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full mr-1.5",
          level === "low" && "bg-emerald-400",
          level === "medium" && "bg-yellow-400",
          level === "high" && "bg-orange-400",
          level === "critical" && "bg-red-400 animate-pulse",
        )}
      />
      {config.label}
    </span>
  );
}

interface SuspicionScoreCardProps {
  score: number;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Large, prominent suspicion score display with explanation
 */
export function SuspicionScoreCard({
  score,
  title = "Suspicion Score",
  description,
  className,
}: SuspicionScoreCardProps) {
  const riskLevel = getRiskLevelFromScore(score);
  const config = RISK_LEVEL_CONFIG[riskLevel];
  const percentage = Math.round(score * 100);

  const explanations: Record<RiskLevel, string> = {
    low: "Normal transaction patterns. No suspicious activity detected.",
    medium: "Some unusual patterns detected. Worth monitoring.",
    high: "Multiple risk indicators present. Investigation recommended.",
    critical: "Clear signs of illicit activity. Immediate action required.",
  };

  return (
    <div
      className={cn(
        "p-6 rounded-xl border bg-zinc-900",
        config.borderColor,
        className,
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-zinc-500" />
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="bg-zinc-800 text-zinc-200 p-3 rounded-lg text-xs max-w-[200px] border border-zinc-700"
            >
              Score breakdown:
              <br />• 0-40%: Low Risk
              <br />• 40-60%: Medium Risk
              <br />• 60-80%: High Risk
              <br />• 80-100%: Critical
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-end gap-4">
        <div className={cn("text-5xl font-bold tabular-nums", config.color)}>
          {percentage}
          <span className="text-2xl">%</span>
        </div>
        <RiskBadge level={riskLevel} />
      </div>

      <div className="mt-4">
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              riskLevel === "low" &&
                "bg-gradient-to-r from-emerald-600 to-emerald-400",
              riskLevel === "medium" &&
                "bg-gradient-to-r from-yellow-600 to-yellow-400",
              riskLevel === "high" &&
                "bg-gradient-to-r from-orange-600 to-orange-400",
              riskLevel === "critical" &&
                "bg-gradient-to-r from-red-600 to-red-400",
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className={cn("mt-3 text-sm", config.color)}>
        {explanations[riskLevel]}
      </p>
    </div>
  );
}

interface ModelPredictionBreakdownProps {
  predictions: {
    catboost: number;
    lightgbm: number;
    logistic_regression: number;
    random_forest: number;
    xgboost: number;
  };
  className?: string;
}

/**
 * Shows individual ML model predictions with visual breakdown
 */
export function ModelPredictionBreakdown({
  predictions,
  className,
}: ModelPredictionBreakdownProps) {
  const models = [
    { name: "CatBoost", key: "catboost", color: "bg-blue-500" },
    { name: "LightGBM", key: "lightgbm", color: "bg-purple-500" },
    { name: "XGBoost", key: "xgboost", color: "bg-cyan-500" },
    { name: "Random Forest", key: "random_forest", color: "bg-green-500" },
    {
      name: "Logistic Reg.",
      key: "logistic_regression",
      color: "bg-amber-500",
    },
  ] as const;

  return (
    <div className={cn("space-y-3", className)}>
      <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
        ML Model Consensus
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="bg-zinc-800 text-zinc-200 p-3 rounded-lg text-xs max-w-[250px] border border-zinc-700"
            >
              Each bar shows individual model prediction. Higher agreement =
              more confidence in the final result.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h4>
      {models.map(({ name, key, color }) => {
        const value = predictions[key];
        const pct = Math.round(value * 100);
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 w-24 truncate">{name}</span>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", color)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-mono text-zinc-400 w-10 text-right">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface RiskIndicatorListProps {
  indicators: string[];
  className?: string;
}

/**
 * List of risk indicators with icons
 */
export function RiskIndicatorList({
  indicators,
  className,
}: RiskIndicatorListProps) {
  if (!indicators || indicators.length === 0) {
    return (
      <div className={cn("text-sm text-zinc-500", className)}>
        No risk indicators detected
      </div>
    );
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {indicators.map((indicator, idx) => (
        <li
          key={idx}
          className="flex items-start gap-2 text-sm text-zinc-300 bg-zinc-800/50 p-2 rounded-lg border border-zinc-700/50"
        >
          <span className="text-amber-500 mt-0.5">⚠</span>
          <span>{indicator}</span>
        </li>
      ))}
    </ul>
  );
}
