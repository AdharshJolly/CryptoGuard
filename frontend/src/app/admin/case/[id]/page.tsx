"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
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
  ArrowLeft,
  FileSearch,
  AlertTriangle,
  Clock,
  Users,
  Network,
  Zap,
  TrendingUp,
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle,
  ChevronDown,
  Flag,
  Search,
  ShieldAlert,
  Archive,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  WalletAnalysisResponse,
  SmurfingPattern,
  PredictResponse,
  VisualizeResponse,
  formatWalletAddress,
  formatCurrency,
  formatNumber,
  getRiskLevelFromScore,
  RISK_LEVEL_CONFIG,
} from "@/lib/api/crypto-types";
import {
  SuspicionScoreCard,
  ModelPredictionBreakdown,
  RiskIndicatorList,
  RiskBadge,
} from "@/components/ui/risk-indicators";
import {
  WalletSummaryCard,
  CentralityMetrics,
  SmurfingPatternCard,
} from "@/components/ui/wallet-analysis";

// Dynamic imports
const D3NetworkGraph = dynamic(
  () =>
    import("@/components/visualizations/D3NetworkGraph").then((mod) => ({
      default: mod.D3NetworkGraph,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-zinc-950 animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-zinc-500">Loading network visualization...</span>
      </div>
    ),
  },
);

// Mock case data with full API response format
interface CaseDetailData {
  id: string;
  type: string;
  status: string;
  created: string;
  assignee: string;
  description: string;
  // From /crypto/analyze-wallet
  walletAnalysis: WalletAnalysisResponse;
  // From /predict
  prediction: PredictResponse;
  // From /crypto/visualize
  graphData: VisualizeResponse;
}

const MOCK_CASE_DATA: Record<string, CaseDetailData> = {
  "CASE-2024-001": {
    id: "CASE-2024-001",
    type: "Smurfing",
    status: "Open",
    created: "Jan 29, 2026",
    assignee: "Agent Smith",
    description:
      "Multiple smurfing patterns detected originating from this wallet. Funds are being split across multiple intermediary wallets before reconsolidation.",
    walletAnalysis: {
      wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      classification: "positive",
      risk_level: "critical",
      suspicion_score: 0.92,
      wallet_summary: {
        total_received: 125000,
        total_sent: 123500,
        unique_senders: 8,
        unique_receivers: 28,
        centrality: {
          degree: 0.45,
          betweenness: 0.62,
          pagerank: 0.087,
          closeness: 0.73,
        },
        distance_to_illicit: 1,
      },
      smurfing_patterns_detected: 4,
      smurfing_patterns: [
        {
          source: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          destination: "0xFinalDest123456789abcdef123456789abcdef12",
          intermediaries: [
            "0xInt1234567890abcdef1234567890abcdef123456",
            "0xInt2345678901bcdef2345678901bcdef234567",
            "0xInt3456789012cdef3456789012cdef345678",
          ],
          suspicion_score: 0.94,
          metrics: {
            total_amount: 45000,
            transaction_count: 32,
            path_length: 4,
            time_span_hours: 6,
          },
        },
        {
          source: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          destination: "0xAnotherDest987654321fedcba987654321fedcb",
          intermediaries: [
            "0xIntA123456789abcdef123456789abcdef12345",
            "0xIntB234567890bcdef234567890bcdef23456",
          ],
          suspicion_score: 0.88,
          metrics: {
            total_amount: 28000,
            transaction_count: 18,
            path_length: 3,
            time_span_hours: 4,
          },
        },
      ],
      peeling_chains_detected: 1,
      analysis_type: "blockchain_graph_analysis",
    },
    prediction: {
      prediction_breakdown: {
        catboost: 0.9135,
        lightgbm: 0.9046,
        logistic_regression: 0.95,
        random_forest: 0.8755,
        xgboost: 0.9257,
      },
      base_ml_prediction: 0.9139,
      crypto_risk_score: 0.35,
      final_prediction: 0.92,
      classification: "positive",
      token_type: "ETH",
      crypto_risk_indicators: [
        "Fan-out to 28 unique wallets within 24 hours",
        "High transaction velocity: 47 transactions in 12 hours",
        "Multiple cross-chain transfers: 3 detected",
        "Connection to wallet 1 hop from known illicit address",
        "High betweenness centrality: bridge node in network",
      ],
      analysis_type: "crypto_enhanced",
    },
    graphData: {
      nodes: [
        {
          id: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          label: "0x742d...f0bEb",
          suspicion_score: 0.92,
          size: 30,
          color: "#ef4444",
          highlighted: true,
        },
        {
          id: "0xInt1234567890abcdef1234567890abcdef123456",
          label: "0xInt1...3456",
          suspicion_score: 0.65,
          size: 20,
          color: "#f97316",
          highlighted: false,
        },
        {
          id: "0xInt2345678901bcdef2345678901bcdef234567",
          label: "0xInt2...4567",
          suspicion_score: 0.58,
          size: 18,
          color: "#eab308",
          highlighted: false,
        },
        {
          id: "0xInt3456789012cdef3456789012cdef345678",
          label: "0xInt3...5678",
          suspicion_score: 0.52,
          size: 16,
          color: "#eab308",
          highlighted: false,
        },
        {
          id: "0xFinalDest123456789abcdef123456789abcdef12",
          label: "0xFina...ef12",
          suspicion_score: 0.85,
          size: 25,
          color: "#ef4444",
          highlighted: false,
          is_illicit: true,
        },
        {
          id: "0xSource1abcdef1234567890abcdef12345678901",
          label: "0xSour...8901",
          suspicion_score: 0.35,
          size: 15,
          color: "#22c55e",
          highlighted: false,
        },
        {
          id: "0xSource2bcdef234567890abcdef234567890123",
          label: "0xSour...0123",
          suspicion_score: 0.28,
          size: 14,
          color: "#22c55e",
          highlighted: false,
        },
      ],
      edges: [
        {
          from: "0xSource1abcdef1234567890abcdef12345678901",
          to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          value: 35000,
          label: "0.875 BTC",
          transactions: 5,
          width: 3,
        },
        {
          from: "0xSource2bcdef234567890abcdef234567890123",
          to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          value: 28000,
          label: "9.8 ETH",
          transactions: 3,
          width: 2.5,
        },
        {
          from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          to: "0xInt1234567890abcdef1234567890abcdef123456",
          value: 15000,
          label: "82.5 SOL",
          transactions: 8,
          width: 2,
        },
        {
          from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          to: "0xInt2345678901bcdef2345678901bcdef234567",
          value: 12000,
          label: "15K MATIC",
          transactions: 6,
          width: 1.8,
        },
        {
          from: "0xInt1234567890abcdef1234567890abcdef123456",
          to: "0xInt3456789012cdef3456789012cdef345678",
          value: 14500,
          label: "406 AVAX",
          transactions: 7,
          width: 1.9,
        },
        {
          from: "0xInt2345678901bcdef2345678901bcdef234567",
          to: "0xInt3456789012cdef3456789012cdef345678",
          value: 11500,
          label: "1.61K DOT",
          transactions: 5,
          width: 1.7,
        },
        {
          from: "0xInt3456789012cdef3456789012cdef345678",
          to: "0xFinalDest123456789abcdef123456789abcdef12",
          value: 25000,
          label: "0.625 BTC",
          transactions: 4,
          width: 2.5,
        },
      ],
      graph_statistics: {
        total_nodes: 7,
        total_edges: 7,
        illicit_nodes: 1,
        high_risk_nodes: 2,
      },
    },
  },
};

// Default case data for cases not in mock
const getDefaultCaseData = (id: string): CaseDetailData => ({
  id,
  type: "Unknown",
  status: "Open",
  created: "Jan 31, 2026",
  assignee: "Unassigned",
  description:
    "Case details are being loaded from the blockchain analysis system.",
  walletAnalysis: {
    wallet_address: "0x0000000000000000000000000000000000000000",
    classification: "negative",
    risk_level: "low",
    suspicion_score: 0.25,
    wallet_summary: {
      total_received: 0,
      total_sent: 0,
      unique_senders: 0,
      unique_receivers: 0,
      centrality: { degree: 0, betweenness: 0, pagerank: 0, closeness: 0 },
      distance_to_illicit: null,
    },
    smurfing_patterns_detected: 0,
    smurfing_patterns: [],
    peeling_chains_detected: 0,
    analysis_type: "blockchain_graph_analysis",
  },
  prediction: {
    prediction_breakdown: {
      catboost: 0.25,
      lightgbm: 0.28,
      logistic_regression: 0.22,
      random_forest: 0.3,
      xgboost: 0.26,
    },
    base_ml_prediction: 0.26,
    crypto_risk_score: 0.1,
    final_prediction: 0.25,
    classification: "negative",
    crypto_risk_indicators: [],
    analysis_type: "crypto_enhanced",
  },
  graphData: {
    nodes: [],
    edges: [],
    graph_statistics: {
      total_nodes: 0,
      total_edges: 0,
      illicit_nodes: 0,
      high_risk_nodes: 0,
    },
  },
});

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [caseData, setCaseData] = useState<CaseDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  // Fetch case data from API
  useEffect(() => {
    const fetchCaseData = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/cases/${caseId}`,
        );
        if (!response.ok) throw new Error("Failed to fetch case data");

        const data = await response.json();
        console.log("Raw case data:", data);
        console.log("Graph data:", data.graph_data);

        // Transform API response to match CaseDetailData interface
        const transformedData: CaseDetailData = {
          id: data.case_id,
          type:
            data.laundering_pattern?.type ||
            data.laundering_pattern?.pattern_type ||
            "Investigation",
          status: data.status,
          created: new Date(data.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          assignee: data.assignee || "Unassigned",
          description:
            data.risk_indicators?.join(". ") ||
            "Suspicious activity detected requiring investigation.",
          walletAnalysis:
            data.wallet_analysis || getDefaultCaseData(caseId).walletAnalysis,
          prediction: data.prediction || getDefaultCaseData(caseId).prediction,
          graphData: data.graph_data || getDefaultCaseData(caseId).graphData,
        };

        console.log("Transformed graph data:", transformedData.graphData);
        setCaseData(transformedData);
      } catch (error) {
        console.error("Error fetching case data:", error);
        setCaseData(getDefaultCaseData(caseId));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCaseData();
  }, [caseId]);

  // Fetch AI explanation on mount (must be before conditional returns)
  useEffect(() => {
    if (!caseData) return;

    const fetchExplanation = async () => {
      setIsLoadingExplanation(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/cases/${caseId}/explain`,
          {
            method: "POST",
          },
        );
        if (response.ok) {
          const data = await response.json();
          setAiExplanation(data.explanation);
        }
      } catch (error) {
        console.error("Error fetching AI explanation:", error);
      } finally {
        setIsLoadingExplanation(false);
      }
    };

    fetchExplanation();
  }, [caseId, caseData]);

  const handleCopyWallet = () => {
    if (!caseData) return;
    navigator.clipboard.writeText(caseData.walletAnalysis.wallet_address);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleCaseAction = async (action: string, newStatus?: string) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/cases/${caseId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: newStatus,
            note: `Action taken: ${action}`,
          }),
        },
      );

      if (response.ok) {
        const updated = await response.json();
        setCaseData((prev) =>
          prev
            ? {
                ...prev,
                status: updated.status,
              }
            : null,
        );
        setShowActionMenu(false);
      }
    } catch (error) {
      console.error("Error updating case:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400">Case not found</p>
        </div>
      </div>
    );
  }

  const { walletAnalysis, prediction, graphData } = caseData;
  const riskLevel = getRiskLevelFromScore(walletAnalysis.suspicion_score);
  const config = RISK_LEVEL_CONFIG[riskLevel];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/admin/cases">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cases
          </Button>
        </Link>
      </div>

      {/* Case Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`p-4 rounded-xl ${config.bgColor} border ${config.borderColor}`}
          >
            <FileSearch className={config.color} size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {caseData.id}
              </h1>
              <RiskBadge level={riskLevel} />
              <Badge variant="outline" className="bg-zinc-950">
                {caseData.status}
              </Badge>
            </div>
            <p className="text-zinc-500 mt-1">{caseData.type} Investigation</p>
            <div className="flex items-center gap-4 mt-2">
              <code className="text-sm bg-zinc-800 px-3 py-1 rounded text-zinc-300 flex items-center gap-2">
                {formatWalletAddress(walletAnalysis.wallet_address, 10)}
                <button
                  onClick={handleCopyWallet}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  {copiedWallet ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={`https://etherscan.io/address/${walletAnalysis.wallet_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-blue-400 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </code>
            </div>
          </div>
        </div>
        <div className="relative">
          <Button
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            onClick={() => setShowActionMenu(!showActionMenu)}
          >
            Take Action
            <ChevronDown className="w-4 h-4" />
          </Button>
          {showActionMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50">
              <div className="p-2">
                <button
                  onClick={() =>
                    handleCaseAction("Start Investigation", "Investigating")
                  }
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-800 transition-colors text-zinc-300 flex items-center gap-2"
                >
                  <Search className="w-4 h-4 text-purple-400" />
                  <span>Mark as Investigating</span>
                </button>
                <button
                  onClick={() => handleCaseAction("Escalate", "Open")}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-800 transition-colors text-zinc-300 flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Escalate to Authority</span>
                </button>
                <button
                  onClick={() => handleCaseAction("Request More Info", "Open")}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-800 transition-colors text-zinc-300 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Request More Information</span>
                </button>
                <button
                  onClick={() =>
                    handleCaseAction("Flag as False Positive", "Closed")
                  }
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-800 transition-colors text-zinc-300 flex items-center gap-2"
                >
                  <Flag className="w-4 h-4 text-zinc-500" />
                  <span>Flag as False Positive</span>
                </button>
                <div className="border-t border-zinc-800 my-2" />
                <button
                  onClick={() => handleCaseAction("Close Case", "Closed")}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-zinc-800 transition-colors text-zinc-300 flex items-center gap-2"
                >
                  <Archive className="w-4 h-4 text-emerald-400" />
                  <span>Close Case</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Risk Explanation */}
      <Card className="bg-gradient-to-br from-purple-950/20 via-blue-950/20 to-purple-950/20 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Risk Analysis
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 ml-2">
              Powered by Gemini
            </Badge>
          </CardTitle>
          <CardDescription>
            Automated explanation of why this wallet was flagged for
            investigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingExplanation ? (
            <div className="flex items-center gap-3 text-zinc-400">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span>Generating AI explanation...</span>
            </div>
          ) : aiExplanation ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {aiExplanation}
              </p>
            </div>
          ) : (
            <p className="text-zinc-500 italic">
              AI explanation unavailable. Configure Gemini API key to enable
              this feature.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-white">
              {walletAnalysis.smurfing_patterns_detected}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Smurfing Patterns</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-white">
              {walletAnalysis.peeling_chains_detected}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Peeling Chains</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-white">
              {walletAnalysis.wallet_summary.unique_receivers}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Unique Receivers</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-white">
              {graphData.graph_statistics.total_nodes}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Network Nodes</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p
              className={`text-3xl font-bold ${
                walletAnalysis.wallet_summary.distance_to_illicit !== null &&
                walletAnalysis.wallet_summary.distance_to_illicit <= 2
                  ? "text-red-400"
                  : "text-white"
              }`}
            >
              {walletAnalysis.wallet_summary.distance_to_illicit ?? "N/A"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Hops to Illicit</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-400">
              {graphData.graph_statistics.high_risk_nodes}
            </p>
            <p className="text-xs text-zinc-500 mt-1">High Risk Nodes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suspicion Score + ML Breakdown */}
        <div className="space-y-6">
          <SuspicionScoreCard
            score={walletAnalysis.suspicion_score}
            title="Overall Suspicion Score"
            description="Combined ML + Graph Analysis"
          />

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                ML Model Predictions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ModelPredictionBreakdown
                predictions={prediction.prediction_breakdown}
              />
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-500">Base ML Score:</span>
                  <span className="text-white font-medium">
                    {Math.round(prediction.base_ml_prediction * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-500">Crypto Risk Bonus:</span>
                  <span className="text-orange-400 font-medium">
                    +{Math.round(prediction.crypto_risk_score * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-zinc-700">
                  <span className="text-zinc-400 font-medium">
                    Final Score:
                  </span>
                  <span className={`font-bold ${config.color}`}>
                    {Math.round(prediction.final_prediction * 100)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Summary + Centrality */}
        <div className="space-y-6">
          <WalletSummaryCard
            summary={walletAnalysis.wallet_summary}
            walletAddress={walletAnalysis.wallet_address}
          />

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <CentralityMetrics
                centrality={walletAnalysis.wallet_summary.centrality}
              />
            </CardContent>
          </Card>
        </div>

        {/* Risk Indicators */}
        <div className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Risk Indicators
              </CardTitle>
              <CardDescription>
                {prediction.crypto_risk_indicators.length} indicators detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RiskIndicatorList
                indicators={prediction.crypto_risk_indicators}
              />
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Created:</span>
                <span className="text-white">{caseData.created}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Assignee:</span>
                <span className="text-white">{caseData.assignee}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Analysis Type:</span>
                <span className="text-blue-400">
                  {prediction.analysis_type}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Classification:</span>
                <span
                  className={
                    walletAnalysis.classification === "positive"
                      ? "text-red-400"
                      : "text-emerald-400"
                  }
                >
                  {walletAnalysis.classification === "positive"
                    ? "Suspicious"
                    : "Clear"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction Network Visualization */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-400" />
            Transaction Network Graph
          </CardTitle>
          <CardDescription>
            Interactive visualization of wallet connections and fund flows.
            {graphData && graphData.nodes.length > 0
              ? " Scroll to zoom, drag to pan, click nodes for details."
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {graphData &&
          graphData.nodes.length > 0 &&
          graphData.edges.length > 0 ? (
            <D3NetworkGraph data={graphData} height={500} />
          ) : graphData && graphData.nodes.length > 0 ? (
            <div className="h-[500px] flex items-center justify-center bg-zinc-950 rounded-lg">
              <div className="text-center space-y-2">
                <Network className="w-12 h-12 text-zinc-700 mx-auto" />
                <p className="text-zinc-500">
                  Single wallet node - no transaction edges available
                </p>
                <p className="text-xs text-zinc-600">
                  This wallet may be newly created or have limited transaction
                  history
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[500px] flex items-center justify-center bg-zinc-950 rounded-lg">
              <div className="text-center space-y-2">
                <Network className="w-12 h-12 text-zinc-700 mx-auto" />
                <p className="text-zinc-500">
                  No transaction network data available
                </p>
                <p className="text-xs text-zinc-600">
                  Run the simulation to generate transaction history
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smurfing Patterns */}
      {walletAnalysis.smurfing_patterns.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" />
              Detected Smurfing Patterns
            </CardTitle>
            <CardDescription>
              {walletAnalysis.smurfing_patterns_detected} fan-out/fan-in
              patterns identified
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {walletAnalysis.smurfing_patterns.map((pattern, idx) => (
                <SmurfingPatternCard key={idx} pattern={pattern} index={idx} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case Description */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Case Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-400">{caseData.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
