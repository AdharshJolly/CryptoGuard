"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  Search,
  TrendingUp,
  Shield,
  Zap,
  Network,
  Eye,
  Wallet,
  FileText,
  ExternalLink,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import {
  BatchAnalyzeResponse,
  formatCurrency,
  formatWalletAddress,
  RISK_LEVEL_CONFIG,
  LogEntry as ApiLogEntry,
} from "@/lib/api/crypto-types";
import { RiskBadge } from "@/components/ui/risk-indicators";
import { BatchAnalysisSummary } from "@/components/ui/wallet-analysis";
import { MOCK_BATCH_DATA, MOCK_GRAPH_DATA } from "@/lib/api/mock-data";
import { cryptoApi } from "@/lib/api/crypto-client";

// Crypto currency formatting
const CRYPTO_CURRENCIES = [
  { symbol: "BTC", rate: 0.000025 },
  { symbol: "ETH", rate: 0.00035 },
  { symbol: "SOL", rate: 0.0055 },
  { symbol: "MATIC", rate: 1.25 },
  { symbol: "AVAX", rate: 0.028 },
];

const formatCryptoAmount = (amount: number, walletAddress?: string) => {
  let hash = 0;
  if (walletAddress) {
    for (let i = 0; i < walletAddress.length; i++) {
      hash = (hash << 5) - hash + walletAddress.charCodeAt(i);
      hash |= 0;
    }
  }
  const crypto = CRYPTO_CURRENCIES[Math.abs(hash) % CRYPTO_CURRENCIES.length];
  const cryptoAmount = amount * crypto.rate;
  if (cryptoAmount >= 1000)
    return `${(cryptoAmount / 1000).toFixed(2)}K ${crypto.symbol}`;
  if (cryptoAmount >= 1) return `${cryptoAmount.toFixed(2)} ${crypto.symbol}`;
  return `${cryptoAmount.toFixed(4)} ${crypto.symbol}`;
};

// Dynamic import for client-side only 3D component
const LaunderingTopology = dynamic(
  () =>
    import("@/components/visualizations/LaunderingTopology").then((mod) => ({
      default: mod.LaunderingTopology,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-black animate-pulse rounded-lg" />
    ),
  },
);

interface LogEntry {
  id: number;
  message: string;
  type: "info" | "warning" | "alert" | "success";
  time: string;
  details?: string;
}

export default function AdminOverviewPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [batchData, setBatchData] = useState<BatchAnalyzeResponse>({
    total_wallets_analyzed: 0,
    critical_risk_wallets: 0,
    high_risk_wallets: 0,
    medium_risk_wallets: 0,
    low_risk_wallets: 0,
    wallet_rankings: [],
    analysis_type: "batch_blockchain_analysis",
  });
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [openCases, setOpenCases] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [smurfingPatterns, setSmurfingPatterns] = useState(0);
  const [metaMaskAddress, setMetaMaskAddress] = useState<string | null>(null);
  const [isConnectingMetaMask, setIsConnectingMetaMask] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [simulationStats, setSimulationStats] = useState({
    cyclesRun: 0,
    walletsAnalyzed: 0,
    casesCreated: 0,
  });

  // Generate realistic Ethereum wallet address
  const generateWalletAddress = (): string => {
    const chars = "0123456789abcdef";
    let address = "0x";
    for (let i = 0; i < 40; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  };

  // Generate realistic transaction data with suspicious patterns
  const generateRealisticTransactions = (numWallets: number = 15) => {
    const transactions = [];
    const wallets = Array.from({ length: numWallets }, () =>
      generateWalletAddress(),
    );
    const tokenTypes = [
      "ETH",
      "USDT",
      "USDC",
      "BTC",
      "DAI",
      "WETH",
      "LINK",
      "UNI",
    ];

    // Create some known illicit wallets for graph connections
    const illicitWallets = [
      "0x" + "a".repeat(40),
      "0x" + "b".repeat(40),
      "0x" + "c".repeat(40),
      "0x" + "d".repeat(40),
    ];

    // Generate different transaction patterns with varying likelihood
    const patterns = [
      { type: "SMURFING", weight: 0.25 }, // 25% - Highly suspicious
      { type: "PEELING", weight: 0.2 }, // 20% - Suspicious
      { type: "MIXING", weight: 0.15 }, // 15% - Suspicious
      { type: "RAPID_FIRE", weight: 0.15 }, // 15% - Velocity attack
      { type: "CROSS_CHAIN", weight: 0.1 }, // 10% - Privacy coins
      { type: "NORMAL", weight: 0.15 }, // 15% - Regular activity
    ];

    // Weighted random selection
    const rand = Math.random();
    let cumulative = 0;
    let pattern = "NORMAL";
    for (const p of patterns) {
      cumulative += p.weight;
      if (rand <= cumulative) {
        pattern = p.type;
        break;
      }
    }

    const baseTime = Date.now();
    const baseAmount = parseFloat((Math.random() * 50 + 10).toFixed(4)); // $10-$60 base

    if (pattern === "SMURFING") {
      // Create fan-out/fan-in pattern (highly suspicious)
      const source = wallets[0];
      const intermediaries = wallets.slice(1, 8);
      const destination = wallets[8];

      // Fan-out: Source splits to many intermediaries
      intermediaries.forEach((inter, idx) => {
        transactions.push({
          source_wallet: source,
          dest_wallet: inter,
          amount: parseFloat((Math.random() * 5 + 0.5).toFixed(4)),
          timestamp: new Date(baseTime + idx * 60000).toISOString(),
          token_type: tokenTypes[Math.floor(Math.random() * tokenTypes.length)],
        });
      });

      // Fan-in: Intermediaries reaggregate to destination
      intermediaries.forEach((inter, idx) => {
        transactions.push({
          source_wallet: inter,
          dest_wallet: destination,
          amount: parseFloat((Math.random() * 4 + 0.3).toFixed(4)),
          timestamp: new Date(baseTime + (idx + 10) * 60000).toISOString(),
          token_type: tokenTypes[Math.floor(Math.random() * tokenTypes.length)],
        });
      });

      // Add some connection to illicit wallets
      if (Math.random() > 0.5) {
        transactions.push({
          source_wallet: illicitWallets[0],
          dest_wallet: source,
          amount: parseFloat((Math.random() * 10 + 5).toFixed(4)),
          timestamp: new Date(baseTime - 120000).toISOString(),
          token_type: "BTC",
        });
      }
    } else if (pattern === "PEELING") {
      // Create peeling chain pattern (sequential withdrawals)
      for (let i = 0; i < wallets.length - 1; i++) {
        const amount = parseFloat((10 * Math.pow(0.85, i)).toFixed(4));
        transactions.push({
          source_wallet: wallets[i],
          dest_wallet: wallets[i + 1],
          amount: amount,
          timestamp: new Date(baseTime + i * 180000).toISOString(),
          token_type: "ETH",
        });
      }

      // Connect to illicit wallet
      if (Math.random() > 0.6) {
        transactions.push({
          source_wallet: wallets[wallets.length - 1],
          dest_wallet: illicitWallets[1],
          amount: parseFloat((Math.random() * 3).toFixed(4)),
          timestamp: new Date(baseTime + wallets.length * 180000).toISOString(),
          token_type: "ETH",
        });
      }
    } else if (pattern === "MIXING") {
      // Create circular/mixing pattern
      const mixGroup = wallets.slice(0, 6);
      mixGroup.forEach((wallet, idx) => {
        const nextWallet = mixGroup[(idx + 1) % mixGroup.length];
        transactions.push({
          source_wallet: wallet,
          dest_wallet: nextWallet,
          amount: parseFloat((Math.random() * 8 + 2).toFixed(4)),
          timestamp: new Date(baseTime + idx * 90000).toISOString(),
          token_type: "USDT",
        });
      });

      // Add cross-connections for complexity
      for (let i = 0; i < 5; i++) {
        const from = mixGroup[Math.floor(Math.random() * mixGroup.length)];
        const to = mixGroup[Math.floor(Math.random() * mixGroup.length)];
        if (from !== to) {
          transactions.push({
            source_wallet: from,
            dest_wallet: to,
            amount: parseFloat((Math.random() * 3).toFixed(4)),
            timestamp: new Date(baseTime + (6 + i) * 90000).toISOString(),
            token_type: "USDC",
          });
        }
      }
    } else if (pattern === "RAPID_FIRE") {
      // High-velocity transactions (structuring)
      const source = wallets[0];
      const destinations = wallets.slice(1, 12);

      destinations.forEach((dest, idx) => {
        // Multiple small transactions just under reporting threshold
        transactions.push({
          source_wallet: source,
          dest_wallet: dest,
          amount: parseFloat((Math.random() * 2 + 7.5).toFixed(4)), // $7.5-$9.5 (structured)
          timestamp: new Date(baseTime + idx * 30000).toISOString(), // Every 30 seconds
          token_type: "USDT",
        });
      });

      // Connection to illicit
      if (Math.random() > 0.3) {
        transactions.push({
          source_wallet: illicitWallets[2],
          dest_wallet: source,
          amount: baseAmount * 3,
          timestamp: new Date(baseTime - 600000).toISOString(),
          token_type: "BTC",
        });
      }
    } else if (pattern === "CROSS_CHAIN") {
      // Privacy coin mixing with cross-chain transfers
      const privacyCoins = ["XMR", "ZEC", "DASH"];
      const source = wallets[0];
      const bridge1 = wallets[1];
      const bridge2 = wallets[2];
      const destination = wallets[3];

      // Source -> Bridge1 (ETH)
      transactions.push({
        source_wallet: source,
        dest_wallet: bridge1,
        amount: baseAmount,
        timestamp: new Date(baseTime).toISOString(),
        token_type: "ETH",
      });

      // Bridge1 -> Bridge2 (Privacy coin)
      transactions.push({
        source_wallet: bridge1,
        dest_wallet: bridge2,
        amount: baseAmount * 0.98,
        timestamp: new Date(baseTime + 120000).toISOString(),
        token_type:
          privacyCoins[Math.floor(Math.random() * privacyCoins.length)],
      });

      // Bridge2 -> Destination (Stablecoin)
      transactions.push({
        source_wallet: bridge2,
        dest_wallet: destination,
        amount: baseAmount * 0.95,
        timestamp: new Date(baseTime + 240000).toISOString(),
        token_type: "USDC",
      });

      // Add more obfuscation layers
      for (let i = 4; i < 10; i++) {
        transactions.push({
          source_wallet: wallets[i],
          dest_wallet: wallets[(i + 1) % wallets.length],
          amount: parseFloat((Math.random() * 5 + 1).toFixed(4)),
          timestamp: new Date(baseTime + i * 180000).toISOString(),
          token_type: tokenTypes[Math.floor(Math.random() * tokenTypes.length)],
        });
      }
    } else {
      // Normal activity (low risk)
      for (let i = 0; i < 8; i++) {
        transactions.push({
          source_wallet: wallets[i % wallets.length],
          dest_wallet: wallets[(i + 1) % wallets.length],
          amount: parseFloat((Math.random() * 2 + 0.1).toFixed(4)),
          timestamp: new Date(baseTime + i * 300000).toISOString(),
          token_type: tokenTypes[Math.floor(Math.random() * tokenTypes.length)],
        });
      }
    }

    return { transactions, known_illicit_wallets: illicitWallets, pattern };
  };

  // Run live simulation
  const runSimulation = async (forceRun: boolean = false) => {
    // Only check isSimulationRunning if not forced
    if (!forceRun && !isSimulationRunning) return;

    try {
      // Vary the number of wallets (10-30 for variety)
      const numWallets = Math.floor(Math.random() * 20) + 10;

      // Generate realistic transaction data
      const { transactions, known_illicit_wallets, pattern } =
        generateRealisticTransactions(numWallets);

      // Add local log showing what pattern is being analyzed
      const startLog: LogEntry = {
        id: Date.now(),
        message: `🔄 Analyzing ${numWallets} wallet transaction network...`,
        type: "info",
        time: new Date().toLocaleTimeString(),
        details: `Pattern: ${pattern} • ${transactions.length} transactions`,
      };
      setLogs((prev) => [startLog, ...prev].slice(0, 10));

      // POST to batch analyze endpoint
      const response = await fetch(
        "http://localhost:5000/crypto/batch-analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactions,
            known_illicit_wallets,
          }),
        },
      );

      if (response.ok) {
        const analysisResult = await response.json();

        // Update simulation stats
        setSimulationStats((prev) => ({
          cyclesRun: prev.cyclesRun + 1,
          walletsAnalyzed:
            prev.walletsAnalyzed + analysisResult.total_wallets_analyzed,
          casesCreated: prev.casesCreated,
        }));

        // Local log for analysis complete
        const completeLog: LogEntry = {
          id: Date.now() + 1,
          message: `✓ Analysis complete: ${analysisResult.high_risk_wallets} high-risk detected`,
          type: analysisResult.high_risk_wallets > 0 ? "warning" : "success",
          time: new Date().toLocaleTimeString(),
          details: `${analysisResult.total_wallets_analyzed} wallets • Pattern: ${pattern}`,
        };
        setLogs((prev) => [completeLog, ...prev].slice(0, 10));

        // Auto-create cases for medium and high-risk wallets (score >= 0.5)
        const suspiciousWallets = analysisResult.wallet_rankings.filter(
          (w: any) => w.suspicion_score >= 0.5,
        );

        for (const wallet of suspiciousWallets.slice(0, 3)) {
          // Max 3 cases per cycle
          try {
            const patternType =
              wallet.laundering_pattern?.type ||
              wallet.laundering_pattern?.pattern_type ||
              "UNKNOWN";
            const caseResponse = await fetch(
              "http://localhost:5000/api/cases",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  wallet_address: wallet.wallet_address,
                  suspicion_score: wallet.suspicion_score,
                  patterns: {
                    smurfing_patterns: [
                      "FAN_OUT_FAN_IN",
                      "MULTI_LAYER_REAGGREGATION",
                    ].includes(patternType)
                      ? 1
                      : 0,
                    peeling_chains: [
                      "PEELING_CHAIN",
                      "SEQUENTIAL_PEEL",
                    ].includes(patternType)
                      ? 1
                      : 0,
                  },
                  distance_to_illicit: wallet.distance_to_illicit ?? null,
                  risk_indicators: [
                    `Pattern: ${patternType}`,
                    `Risk Level: ${wallet.risk_level}`,
                    `Volume: ${formatCryptoAmount(wallet.total_received + wallet.total_sent, wallet.wallet_address)}`,
                    `Counterparties: ${wallet.unique_counterparties || 0}`,
                  ],
                  laundering_pattern: wallet.laundering_pattern || {},
                }),
              },
            );

            if (caseResponse.ok) {
              setSimulationStats((prev) => ({
                ...prev,
                casesCreated: prev.casesCreated + 1,
              }));
            }
          } catch (error) {
            console.error("Error creating case:", error);
          }
        }

        // Refresh dashboard metrics immediately
        fetchDashboardMetrics();
      }
    } catch (error) {
      console.error("Simulation error:", error);
      const errorLog: LogEntry = {
        id: Date.now(),
        message: "⚠️ Simulation cycle failed - retrying...",
        type: "warning",
        time: new Date().toLocaleTimeString(),
        details: "Backend connection issue",
      };
      setLogs((prev) => [errorLog, ...prev].slice(0, 10));
    }
  };

  // Fetch real dashboard metrics from API
  const fetchDashboardMetrics = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/dashboard/metrics",
      );
      if (!response.ok) throw new Error("Failed to fetch metrics");

      const data = await response.json();

      // Extract nested data from API response
      const systemMetrics = data.system_metrics || {};
      const batchSummary = data.batch_summary || {};

      // Update metrics from API - backend provides live updating data
      if (systemMetrics.active_alerts !== undefined) {
        setActiveAlerts(systemMetrics.active_alerts);
      }
      if (systemMetrics.open_cases !== undefined) {
        setOpenCases(systemMetrics.open_cases);
      }
      if (systemMetrics.volume_24h !== undefined) {
        setVolume24h(systemMetrics.volume_24h);
      }
      if (systemMetrics.smurfing_patterns !== undefined) {
        setSmurfingPatterns(systemMetrics.smurfing_patterns);
      }

      // Update batch data if available
      if (
        systemMetrics.total_wallets_analyzed !== undefined ||
        batchSummary.high_risk_wallets !== undefined
      ) {
        setBatchData({
          total_wallets_analyzed:
            systemMetrics.total_wallets_analyzed ??
            batchData.total_wallets_analyzed,
          critical_risk_wallets:
            batchSummary.critical_risk_wallets ??
            batchData.critical_risk_wallets,
          high_risk_wallets:
            batchSummary.high_risk_wallets ?? batchData.high_risk_wallets,
          medium_risk_wallets:
            batchSummary.medium_risk_wallets ?? batchData.medium_risk_wallets,
          low_risk_wallets:
            batchSummary.low_risk_wallets ?? batchData.low_risk_wallets,
          wallet_rankings:
            batchSummary.wallet_rankings?.length > 0
              ? batchSummary.wallet_rankings.map((w: any) => ({
                  wallet_address: w.wallet_address,
                  suspicion_score: w.suspicion_score,
                  classification: w.classification,
                  risk_level: w.risk_level,
                  total_received: w.total_received || 0,
                  total_sent: w.total_sent || 0,
                  unique_counterparties: w.unique_counterparties || 0,
                  centrality_score: w.centrality_score || 0,
                }))
              : batchData.wallet_rankings,
          analysis_type: "batch_blockchain_analysis",
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      // Add error log
      const errorLog: LogEntry = {
        id: Date.now(),
        message: "Failed to fetch API data, using demo mode",
        type: "warning",
        time: new Date().toLocaleTimeString(),
        details: "Connect to Flask backend for live data",
      };
      setLogs((prev) => [errorLog, ...prev].slice(0, 10));
    }
  };

  // MetaMask connection and monitoring
  const connectMetaMask = async () => {
    setIsConnectingMetaMask(true);
    try {
      // Check if MetaMask is installed
      if (typeof window !== "undefined" && !(window as any).ethereum) {
        const errorLog: LogEntry = {
          id: Date.now(),
          message: "MetaMask not detected",
          type: "warning",
          time: new Date().toLocaleTimeString(),
          details: "Please install MetaMask extension",
        };
        setLogs((prev) => [errorLog, ...prev].slice(0, 10));
        return;
      }

      // Request account access
      const accounts = (await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        setMetaMaskAddress(address);

        // Add log
        const successLog: LogEntry = {
          id: Date.now(),
          message: `MetaMask connected: ${address.slice(0, 10)}...`,
          type: "success",
          time: new Date().toLocaleTimeString(),
          details: "Monitoring wallet for transactions",
        };
        setLogs((prev) => [successLog, ...prev].slice(0, 10));

        // Send wallet to backend for monitoring
        try {
          const response = await fetch(
            "http://localhost:5000/api/wallet/monitor",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                wallet_address: address,
                auto_analyze: true,
              }),
            },
          );

          if (response.ok) {
            const data = await response.json();

            // Add analysis result log
            if (data.analysis_result) {
              const analysisLog: LogEntry = {
                id: Date.now() + 1,
                message: `Wallet analyzed: ${data.analysis_result.risk_level} risk detected`,
                type:
                  data.analysis_result.risk_level === "low" ? "info" : "alert",
                time: new Date().toLocaleTimeString(),
                details: `Suspicion: ${Math.round(data.analysis_result.suspicion_score * 100)}%`,
              };
              setLogs((prev) => [analysisLog, ...prev].slice(0, 10));
            }

            // Refresh dashboard to show new wallet
            fetchDashboardMetrics();
          }
        } catch (error) {
          console.error("Error monitoring wallet:", error);
        }
      }
    } catch (error: any) {
      console.error("MetaMask connection error:", error);
      const errorLog: LogEntry = {
        id: Date.now(),
        message: "Failed to connect MetaMask",
        type: "warning",
        time: new Date().toLocaleTimeString(),
        details: error.message || "Connection rejected",
      };
      setLogs((prev) => [errorLog, ...prev].slice(0, 10));
    } finally {
      setIsConnectingMetaMask(false);
    }
  };

  const disconnectMetaMask = () => {
    setMetaMaskAddress(null);
    const disconnectLog: LogEntry = {
      id: Date.now(),
      message: "MetaMask disconnected",
      type: "info",
      time: new Date().toLocaleTimeString(),
      details: "Wallet monitoring stopped",
    };
    setLogs((prev) => [disconnectLog, ...prev].slice(0, 10));
  };

  // Initial API fetch on mount
  useEffect(() => {
    fetchDashboardMetrics();

    // Set up interval to refresh dashboard data every 8 seconds
    const metricsInterval = setInterval(() => {
      fetchDashboardMetrics();
    }, 8000);

    // Cleanup interval on unmount
    return () => clearInterval(metricsInterval);
  }, []);

  // Auto-start simulation on mount
  useEffect(() => {
    // Only start simulation on initial mount
    setIsSimulationRunning(true);

    // Run first simulation immediately (force=true bypasses state check)
    runSimulation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency - only run on mount

  // Separate effect to handle simulation interval
  useEffect(() => {
    if (!isSimulationRunning) return;

    const simulationInterval = setInterval(() => {
      runSimulation();
    }, 5000); // Run every 5 seconds

    return () => clearInterval(simulationInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulationRunning]);

  // Real-time log stream using Server-Sent Events (SSE)
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectLogStream = () => {
      try {
        eventSource = new EventSource("http://localhost:5000/api/logs/stream");

        eventSource.onmessage = (event) => {
          try {
            const logData = JSON.parse(event.data);

            // Skip keepalive messages
            if (logData.type === "keepalive") return;

            const newLog: LogEntry = {
              id: Date.now() + Math.random(),
              message: logData.message,
              type: logData.type || "info",
              time: new Date(logData.timestamp).toLocaleTimeString(),
              details:
                typeof logData.details === "string"
                  ? logData.details
                  : logData.details
                    ? `${logData.details.wallet || ""} ${logData.details.risk || ""} ${logData.details.score || ""}`.trim()
                    : undefined,
            };

            setLogs((prev) => [newLog, ...prev].slice(0, 10));
          } catch (error) {
            console.error("Error parsing log event:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE connection error:", error);
          eventSource?.close();

          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (document.visibilityState === "visible") {
              connectLogStream();
            }
          }, 5000);
        };

        // Initial connection log
        const initLog: LogEntry = {
          id: Date.now(),
          message: "Real-time log stream connected",
          type: "success",
          time: new Date().toLocaleTimeString(),
          details: "Listening for blockchain events",
        };
        setLogs((prev) => [initLog, ...prev].slice(0, 10));
      } catch (error) {
        console.error("Failed to establish SSE connection:", error);
      }
    };

    connectLogStream();

    // Cleanup on unmount
    return () => {
      eventSource?.close();
    };
  }, []);

  // Real-time Logs via SSE
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const eventSource = new EventSource(`${apiUrl}/api/logs/stream`);

    eventSource.onopen = () => {
      console.log("SSE Connection Open");
      setIsConnected(true);
      setLogs((prev) => [
        {
          id: Date.now(),
          message: "Real-time event stream connected",
          type: "success",
          time: new Date().toLocaleTimeString(),
          details: "Listening for blockchain events...",
        },
        ...prev,
      ]);
    };

    eventSource.onmessage = (event) => {
      try {
        const logData: ApiLogEntry = JSON.parse(event.data);
        if (logData.type === "keepalive") return;

        const newLog: LogEntry = {
          id: Date.now(),
          message: logData.message,
          type:
            logData.type === "alert" ||
            logData.type === "warning" ||
            logData.type === "success"
              ? logData.type
              : "info",
          time: new Date(logData.timestamp).toLocaleTimeString(),
          details:
            typeof logData.details === "object"
              ? JSON.stringify(logData.details)
              : logData.details,
        };

        setLogs((prev) => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
      } catch (e) {
        console.error("Failed to parse SSE message", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error:", err);
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      setIsConnected(false);
      eventSource.close();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Command Center
          </h1>
          <p className="text-zinc-500 mt-1">
            Real-time AML surveillance dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Badge
            variant="outline"
            className={`gap-1 px-3 py-1 transition-colors ${
              isConnected
                ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10"
                : "text-zinc-500 border-zinc-500/20 bg-zinc-500/10"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"
              }`}
            />
            {isConnected ? "LIVE FEED" : "CONNECTING..."}
          </Badge>
          <Badge
            variant="outline"
            className="text-blue-500 border-blue-500/20 bg-blue-500/10 gap-1 px-3 py-1"
          >
            <Network className="w-3 h-3" />5 Nodes
          </Badge>
          {isSimulationRunning && (
            <Badge
              variant="outline"
              className="text-purple-500 border-purple-500/20 bg-purple-500/10 gap-1 px-3 py-1"
            >
              <Zap className="w-3 h-3 animate-pulse" />
              AI SIMULATION ACTIVE
            </Badge>
          )}
        </div>
      </div>

      {/* Simulation Status Card */}
      {isSimulationRunning && (
        <Card className="bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Activity className="w-5 h-5 text-purple-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Live Transaction Simulation Running
                  </p>
                  <p className="text-xs text-zinc-400">
                    Generating realistic blockchain patterns for demo • Analysis
                    cycle every 10s
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">
                    {simulationStats.cyclesRun}
                  </p>
                  <p className="text-xs text-zinc-500">Cycles</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {simulationStats.walletsAnalyzed}
                  </p>
                  <p className="text-xs text-zinc-500">Wallets</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    {simulationStats.casesCreated}
                  </p>
                  <p className="text-xs text-zinc-500">Cases Created</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await fetch(
                          "http://localhost:5000/api/dashboard/reset",
                          { method: "POST" },
                        );
                        setSimulationStats({
                          cyclesRun: 0,
                          walletsAnalyzed: 0,
                          casesCreated: 0,
                        });
                        setBatchData({
                          total_wallets_analyzed: 0,
                          critical_risk_wallets: 0,
                          high_risk_wallets: 0,
                          medium_risk_wallets: 0,
                          low_risk_wallets: 0,
                          wallet_rankings: [],
                          analysis_type: "batch_blockchain_analysis",
                        });
                        setActiveAlerts(0);
                        setOpenCases(0);
                        setVolume24h(0);
                        setSmurfingPatterns(0);
                        setLogs([
                          {
                            id: Date.now(),
                            message:
                              "🔄 Data reset - Starting fresh simulation",
                            type: "success" as const,
                            time: new Date().toLocaleTimeString(),
                            details: "All metrics cleared",
                          },
                        ]);
                        // Trigger immediate simulation (force=true bypasses state check)
                        runSimulation(true);
                      } catch (error) {
                        console.error("Reset failed:", error);
                      }
                    }}
                    className="px-3 py-1 text-xs rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20 flex items-center gap-1"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh Data
                  </button>
                  <button
                    onClick={() => setIsSimulationRunning(false)}
                    className="px-3 py-1 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20 flex items-center gap-1"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    Stop
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulation Stopped Card */}
      {!isSimulationRunning && (
        <Card className="bg-gradient-to-r from-zinc-900/50 via-zinc-800/50 to-zinc-900/50 border-zinc-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-zinc-700/30">
                  <Activity className="w-5 h-5 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    Simulation Paused
                  </p>
                  <p className="text-xs text-zinc-500">
                    Click Start to resume generating blockchain transaction
                    patterns
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-zinc-500">
                    {simulationStats.cyclesRun}
                  </p>
                  <p className="text-xs text-zinc-600">Cycles</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-zinc-500">
                    {simulationStats.walletsAnalyzed}
                  </p>
                  <p className="text-xs text-zinc-600">Wallets</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-zinc-500">
                    {simulationStats.casesCreated}
                  </p>
                  <p className="text-xs text-zinc-600">Cases Created</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await fetch(
                          "http://localhost:5000/api/dashboard/reset",
                          { method: "POST" },
                        );
                        setSimulationStats({
                          cyclesRun: 0,
                          walletsAnalyzed: 0,
                          casesCreated: 0,
                        });
                        setBatchData({
                          total_wallets_analyzed: 0,
                          critical_risk_wallets: 0,
                          high_risk_wallets: 0,
                          medium_risk_wallets: 0,
                          low_risk_wallets: 0,
                          wallet_rankings: [],
                          analysis_type: "batch_blockchain_analysis",
                        });
                        setActiveAlerts(0);
                        setOpenCases(0);
                        setVolume24h(0);
                        setSmurfingPatterns(0);
                        setLogs([
                          {
                            id: Date.now(),
                            message: "🔄 Data reset successfully",
                            type: "success" as const,
                            time: new Date().toLocaleTimeString(),
                            details: "All metrics cleared",
                          },
                        ]);
                      } catch (error) {
                        console.error("Reset failed:", error);
                      }
                    }}
                    className="px-3 py-1 text-xs rounded-lg bg-zinc-700/30 text-zinc-400 hover:bg-zinc-700/50 transition-colors border border-zinc-600/30 flex items-center gap-1"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Reset Data
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // Reset backend cache first
                        await fetch(
                          "http://localhost:5000/api/dashboard/reset",
                          { method: "POST" },
                        );

                        // Reset all local state
                        setSimulationStats({
                          cyclesRun: 0,
                          walletsAnalyzed: 0,
                          casesCreated: 0,
                        });
                        setBatchData({
                          total_wallets_analyzed: 0,
                          critical_risk_wallets: 0,
                          high_risk_wallets: 0,
                          medium_risk_wallets: 0,
                          low_risk_wallets: 0,
                          wallet_rankings: [],
                          analysis_type: "batch_blockchain_analysis",
                        });
                        setActiveAlerts(0);
                        setOpenCases(0);
                        setVolume24h(0);
                        setSmurfingPatterns(0);

                        // Clear logs and add start message
                        setLogs([
                          {
                            id: Date.now(),
                            message: "▶️ Simulation started fresh",
                            type: "success" as const,
                            time: new Date().toLocaleTimeString(),
                            details:
                              "Cache cleared, generating new transaction patterns",
                          },
                        ]);

                        // Start simulation (force=true bypasses state check)
                        setIsSimulationRunning(true);
                        runSimulation(true);
                      } catch (error) {
                        console.error("Failed to reset:", error);
                        // Start anyway even if reset fails
                        setIsSimulationRunning(true);
                        runSimulation(true);
                      }
                    }}
                    className="px-3 py-1 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 flex items-center gap-1"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Start
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Alerts */}
        <Card className="bg-zinc-900 border-zinc-800 hover:border-red-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <AlertTriangle className="text-red-500 w-6 h-6" />
              </div>
              <Badge variant="destructive" className="text-xs">
                LIVE
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 mb-1">Active Alerts</p>
            <p className="text-3xl font-bold text-white">{activeAlerts}</p>
            <p className="text-xs text-zinc-600 mt-2">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        {/* Open Cases */}
        <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Search className="text-blue-500 w-6 h-6" />
              </div>
              <div className="flex items-center gap-1 text-blue-400 text-xs">
                <Eye className="w-3 h-3" />
                LIVE
              </div>
            </div>
            <p className="text-sm text-zinc-500 mb-1">Open Cases</p>
            <p className="text-3xl font-bold text-white">{openCases}</p>
            <p className="text-xs text-zinc-600 mt-2">Active investigations</p>
          </CardContent>
        </Card>

        {/* Smurfing Patterns */}
        <Card className="bg-zinc-900 border-zinc-800 hover:border-orange-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <Zap className="text-orange-500 w-6 h-6" />
              </div>
              <Badge variant="investigation" className="text-xs">
                LIVE
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 mb-1">Smurfing Patterns</p>
            <p className="text-3xl font-bold text-white">{smurfingPatterns}</p>
            <p className="text-xs text-zinc-600 mt-2">
              Fan-out/fan-in structures
            </p>
          </CardContent>
        </Card>

        {/* 24h Volume */}
        <Card className="bg-zinc-900 border-zinc-800 hover:border-purple-500/30 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Activity className="text-purple-500 w-6 h-6" />
              </div>
              <div className="flex items-center gap-1 text-emerald-400 text-xs">
                <TrendingUp className="w-3 h-3" />
                LIVE
              </div>
            </div>
            <p className="text-sm text-zinc-500 mb-1">Volume (24h)</p>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(volume24h)}
            </p>
            <p className="text-xs text-zinc-600 mt-2">
              Across all monitored chains
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BatchAnalysisSummary
          totalWallets={batchData.total_wallets_analyzed}
          criticalRisk={batchData.critical_risk_wallets}
          highRisk={batchData.high_risk_wallets}
          mediumRisk={batchData.medium_risk_wallets}
          lowRisk={batchData.low_risk_wallets}
          className="lg:col-span-1"
        />

        {/* High Risk Wallets Table */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-red-400" />
              Top 5 Riskiest Wallets
            </CardTitle>
            <CardDescription>
              Real-time view of highest risk wallets across all analysis cycles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                // Show top 5 riskiest wallets overall, sorted by suspicion score
                const topRiskiest = batchData.wallet_rankings
                  .sort((a, b) => b.suspicion_score - a.suspicion_score)
                  .slice(0, 5);

                if (topRiskiest.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Shield className="w-16 h-16 text-zinc-700 mb-4" />
                      <h3 className="text-lg font-semibold text-zinc-400 mb-2">
                        No Wallets Analyzed Yet
                      </h3>
                      <p className="text-sm text-zinc-600 max-w-md">
                        Waiting for simulation to generate blockchain
                        transaction data for analysis...
                      </p>
                    </div>
                  );
                }

                return topRiskiest.map((wallet, idx) => {
                  const config = RISK_LEVEL_CONFIG[wallet.risk_level];
                  return (
                    <div
                      key={wallet.wallet_address}
                      className={`flex items-center justify-between p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${config.bgColor} ${config.color} shrink-0`}
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <code className="text-sm text-white font-mono">
                            {formatWalletAddress(wallet.wallet_address, 8)}
                          </code>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-zinc-500">
                              {wallet.unique_counterparties} counterparties
                            </span>
                            <span className="text-zinc-700">•</span>
                            <span className="text-xs text-zinc-500">
                              {formatCurrency(wallet.total_received)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${config.color}`}>
                            {Math.round(wallet.suspicion_score * 100)}%
                          </p>
                          <p className="text-[10px] text-zinc-500">Suspicion</p>
                        </div>
                        <RiskBadge level={wallet.risk_level} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3D Visualization & Live Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Visual - Takes up 2 columns */}
        <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-400" />
              Laundering Topology Visualization
            </CardTitle>
            <CardDescription>
              Real-time 3D analysis of mixing pools and transaction layers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-[400px]">
            <LaunderingTopology data={MOCK_GRAPH_DATA} />
          </CardContent>
        </Card>

        {/* Live Feed - Takes up 1 column */}
        <Card className="bg-zinc-900 border-zinc-800 max-h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Live Event Stream
            </CardTitle>
            <CardDescription>Real-time blockchain events</CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 custom-scrollbar">
            <div className="space-y-2">
              <AnimatePresence>
                {logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3 rounded-lg border text-xs ${
                      log.type === "alert"
                        ? "bg-red-950/30 border-red-900/50"
                        : log.type === "warning"
                          ? "bg-amber-950/30 border-amber-900/50"
                          : log.type === "success"
                            ? "bg-emerald-950/30 border-emerald-900/50"
                            : "bg-zinc-950 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 ${
                          log.type === "alert"
                            ? "text-red-400"
                            : log.type === "warning"
                              ? "text-amber-400"
                              : log.type === "success"
                                ? "text-emerald-400"
                                : "text-zinc-500"
                        }`}
                      >
                        {log.type === "alert"
                          ? "🚨"
                          : log.type === "warning"
                            ? "⚠️"
                            : log.type === "success"
                              ? "✅"
                              : "ℹ️"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium ${
                            log.type === "alert"
                              ? "text-red-200"
                              : log.type === "warning"
                                ? "text-amber-200"
                                : log.type === "success"
                                  ? "text-emerald-200"
                                  : "text-zinc-300"
                          }`}
                        >
                          {log.message}
                        </p>
                        {log.details && (
                          <p className="text-zinc-500 mt-0.5">{log.details}</p>
                        )}
                        <p className="text-zinc-600 mt-1">{log.time}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status Footer */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  }`}
                />
                <span className="text-sm text-zinc-400">
                  ML Models: {isConnected ? "Online" : "Connecting..."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-400">
                  Graph Analysis: Active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-400">API Latency: 45ms</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">
                All Systems Operational
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
