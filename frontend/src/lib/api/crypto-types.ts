// ================================
// CRYPTO AML API - TYPE DEFINITIONS
// ================================

// =========== CRYPTO CURRENCY UTILITIES ===========

// Crypto currency definitions for formatting - used throughout the app
export const CRYPTO_CURRENCIES = [
  { symbol: "BTC", name: "Bitcoin", rate: 0.000025, color: "#F7931A" },
  { symbol: "ETH", name: "Ethereum", rate: 0.00035, color: "#627EEA" },
  { symbol: "SOL", name: "Solana", rate: 0.0055, color: "#00D18C" },
  { symbol: "MATIC", name: "Polygon", rate: 1.25, color: "#8247E5" },
  { symbol: "AVAX", name: "Avalanche", rate: 0.028, color: "#E84142" },
  { symbol: "DOT", name: "Polkadot", rate: 0.14, color: "#E6007A" },
  { symbol: "LINK", name: "Chainlink", rate: 0.065, color: "#375BD2" },
  { symbol: "XRP", name: "Ripple", rate: 2.0, color: "#23292F" },
];

// Get a consistent crypto based on any string (wallet address, etc.)
export function getCryptoForString(str: string): (typeof CRYPTO_CURRENCIES)[0] {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return CRYPTO_CURRENCIES[Math.abs(hash) % CRYPTO_CURRENCIES.length];
}

// Format amount as cryptocurrency
export function formatCryptoAmount(
  amount: number,
  identifier?: string,
): string {
  // Default to BTC if anything goes wrong
  const defaultCrypto = CRYPTO_CURRENCIES[0];
  let crypto;

  if (identifier && identifier.length > 0) {
    crypto = getCryptoForString(identifier);
  } else {
    const index = Math.floor(Math.abs(amount) / 500) % CRYPTO_CURRENCIES.length;
    crypto = CRYPTO_CURRENCIES[index];
  }

  // Fallback to default if crypto is undefined
  if (!crypto) crypto = defaultCrypto;

  const cryptoAmount = amount * crypto.rate;
  if (cryptoAmount >= 1000)
    return `${(cryptoAmount / 1000).toFixed(2)}K ${crypto.symbol}`;
  if (cryptoAmount >= 1) return `${cryptoAmount.toFixed(2)} ${crypto.symbol}`;
  if (cryptoAmount >= 0.0001)
    return `${cryptoAmount.toFixed(4)} ${crypto.symbol}`;
  return `${cryptoAmount.toFixed(6)} ${crypto.symbol}`;
}

// Format portfolio total as multi-crypto representation
export function formatPortfolioTotal(
  totalValue: number,
  currencies?: Array<{ symbol: string; balance: number }>,
): string {
  if (currencies && currencies.length > 0) {
    // Show actual crypto balances
    const top3 = currencies.slice(0, 3);
    return top3.map((c) => `${c.balance.toFixed(2)} ${c.symbol}`).join(" + ");
  }
  // Fallback: convert to a representative crypto mix
  const btcAmount = totalValue * 0.000025;
  const ethAmount = totalValue * 0.00035;
  if (btcAmount >= 1) return `≈ ${btcAmount.toFixed(2)} BTC`;
  if (ethAmount >= 1) return `≈ ${ethAmount.toFixed(2)} ETH`;
  return `≈ ${(totalValue * 0.0055).toFixed(2)} SOL`;
}

// =========== COMMON TYPES ===========

export interface WalletCentrality {
  degree: number;
  betweenness: number;
  pagerank: number;
  closeness: number;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type Classification = "positive" | "negative";

// =========== /predict ENDPOINT ===========

export interface PredictRequest {
  // Standard aggregated features
  total_transaction_count: number;
  total_transaction_sum: number;
  big_transaction_count: number;
  big_transaction_sum: number;
  small_transaction_count: number;
  small_transaction_sum: number;
  from_transaction_count: number;
  from_transaction_sum: number;
  to_transaction_count: number;
  to_transaction_sum: number;
  to_unique_wallet: number;
  from_unique_wallet: number;
  from_unique_big: number;
  to_unique_big: number;
  from_unique_small: number;
  to_unique_small: number;
  // Crypto-enhanced fields (optional)
  token_type?: string;
  wallet_address?: string;
  time_span_hours?: number;
  cross_chain_transfers?: number;
}

export interface PredictionBreakdown {
  catboost: number;
  lightgbm: number;
  logistic_regression: number;
  random_forest: number;
  xgboost: number;
}

export interface PredictResponse {
  prediction_breakdown: PredictionBreakdown;
  base_ml_prediction: number;
  crypto_risk_score: number;
  final_prediction: number;
  classification: Classification;
  token_type?: string;
  crypto_risk_indicators: string[];
  analysis_type: "standard" | "crypto_enhanced";
}

// =========== /crypto/analyze-wallet ENDPOINT ===========

export interface Transaction {
  source_wallet: string;
  dest_wallet: string;
  amount: number;
  timestamp: string;
  token_type: string;
  hash?: string; // Added for transaction history
  status?: string; // Added for transaction history
  gas_metadata?: {
    // Added for transaction history
    gasUsed: string;
    gasPrice: string;
  };
}

export interface WalletAnalysisRequest {
  wallet_address: string;
  transactions: Transaction[];
  known_illicit_wallets?: string[];
}

export interface SmurfingPatternMetrics {
  total_amount: number;
  transaction_count: number;
  path_length: number;
  time_span_hours: number;
}

export interface SmurfingPattern {
  source: string;
  destination: string;
  intermediaries: string[];
  suspicion_score: number;
  metrics: SmurfingPatternMetrics;
}

export interface WalletSummary {
  total_received: number;
  total_sent: number;
  unique_senders: number;
  unique_receivers: number;
  centrality: WalletCentrality;
  distance_to_illicit: number | null;
  is_illicit?: boolean; // Added from docs
}

export interface WalletAnalysisResponse {
  wallet_address: string;
  classification: Classification;
  risk_level: RiskLevel;
  suspicion_score: number;
  wallet_summary: WalletSummary;
  smurfing_patterns_detected: number;
  smurfing_patterns: SmurfingPattern[];
  peeling_chains_detected: number;
  peeling_chains?: any[]; // Added from docs
  analysis_type: "blockchain_graph_analysis";
  laundering_pattern?: {
    // Added from docs
    type: string;
    confidence: number;
    subtype?: string;
    evidence?: string[];
  };
}

// =========== /crypto/batch-analyze ENDPOINT ===========

export interface BatchAnalyzeRequest {
  transactions: Transaction[];
  known_illicit_wallets?: string[];
  wallets_to_analyze?: string[];
}

export interface WalletRanking {
  wallet_address: string;
  suspicion_score: number;
  classification: Classification;
  risk_level: RiskLevel;
  total_received: number;
  total_sent: number;
  unique_counterparties: number;
  centrality_score: number;
}

export interface BatchAnalyzeResponse {
  total_wallets_analyzed: number;
  critical_risk_wallets: number;
  high_risk_wallets: number;
  medium_risk_wallets: number;
  low_risk_wallets: number;
  wallet_rankings: WalletRanking[];
  analysis_type: "batch_blockchain_analysis";
}

// =========== /crypto/detect-smurfing ENDPOINT ===========

export interface SmurfingDetectionRequest {
  transactions: Transaction[];
  source_wallet?: string;
  min_intermediaries?: number;
  max_depth?: number;
}

export interface TopSmurfingPattern {
  source: string;
  destination: string;
  path: string[];
  intermediaries: string[];
  suspicion_score: number;
  metrics: SmurfingPatternMetrics;
}

export interface SmurfingDetectionResponse {
  smurfing_patterns_found: number;
  unique_smurfing_networks: number;
  top_patterns: TopSmurfingPattern[];
  analysis_type: "smurfing_detection";
  patterns_detected?: number; // Alias from docs
  smurfing_patterns?: any[]; // Alias from docs
}

// =========== /crypto/visualize ENDPOINT ===========

export interface VisualizeRequest {
  transactions: Transaction[];
  highlight_wallets?: string[];
  known_illicit_wallets?: string[];
  focus_wallet?: string; // Added from docs
}

export interface GraphNode {
  id: string;
  label: string;
  suspicion_score: number;
  size: number;
  color: string;
  highlighted: boolean;
  is_illicit?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  value: number;
  label: string;
  transactions: number;
  width: number;
  color?: string; // Added from docs
}

export interface GraphStatistics {
  total_nodes: number;
  total_edges: number;
  illicit_nodes?: number; // Optional in docs
  high_risk_nodes: number;
}

export interface VisualizeResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  graph_statistics?: GraphStatistics; // Optional in docs (statistics)
  statistics?: GraphStatistics; // Alias from docs
}

// =========== /crypto/explain-suspicion ENDPOINT ===========

export interface ExplainSuspicionRequest {
  wallet_address: string;
  transactions: Transaction[];
  known_illicit_wallets?: string[];
}

export interface SuspicionExplanation {
  executive_summary: string;
  detailed_explanation: string;
  risk_level: string;
  recommendations: string[];
  analysis?: string; // Fallback/Alternative structure
  key_findings?: string[]; // Fallback/Alternative structure
}

export interface ComponentDetails {
  score: number;
  details: {
    description: string;
    [key: string]: any;
  };
}

export interface ExplainSuspicionResponse {
  wallet_address: string;
  total_suspicion_score: number;
  risk_level: RiskLevel;
  classification: Classification;
  laundering_pattern?: any;
  suspicion_explanation: {
    // Component scores
    fan_out_score: number;
    fan_in_score: number;
    temporal_burst_score: number;
    path_similarity_score: number;
    illicit_proximity_score: number;
    executive_summary?: string; // Legacy/Alternative
    detailed_explanation?: string; // Legacy/Alternative
    recommendations?: string[]; // Legacy/Alternative
  };
  ai_explanation: SuspicionExplanation;
  wallet_metrics: {
    total_received: number;
    total_sent: number;
    net_flow: number;
    unique_senders: number;
    unique_receivers: number;
    is_illicit: boolean;
    distance_to_illicit: number;
  };
  detected_patterns: {
    smurfing_patterns: number;
    peeling_chains: number;
  };
  component_details?: Record<string, ComponentDetails>;
  analysis_type: "comprehensive_risk_explanation";
}

// =========== /api/dashboard/metrics ENDPOINT ===========

export interface SystemMetrics {
  total_wallets_analyzed: number;
  active_alerts: number;
  open_cases: number;
  volume_24h: number;
  smurfing_patterns: number;
}

export interface DashboardMetricsResponse {
  system_metrics: SystemMetrics;
  batch_summary: {
    high_risk_wallets: number;
    medium_risk_wallets: number;
    low_risk_wallets: number;
    wallet_rankings: WalletRanking[];
  };
  timestamp: string;
}

// =========== /api/cases ENDPOINTS ===========

export interface CaseNote {
  text: string;
  timestamp: string;
}

export interface Case {
  case_id: string;
  status: "New" | "Open" | "Investigating" | "Closed";
  primary_wallet: string;
  suspicion_score: number;
  patterns: {
    smurfing?: number;
    peeling_chains?: number;
    [key: string]: number | undefined;
  };
  distance_to_illicit: number;
  risk_indicators: string[];
  laundering_pattern: any;
  created_at: string;
  updated_at: string;
  notes: CaseNote[];
}

export interface CreateCaseRequest {
  wallet_address: string;
  suspicion_score: number;
  patterns: any;
  distance_to_illicit: number;
  risk_indicators: string[];
  laundering_pattern: any;
}

export interface UpdateCaseRequest {
  status?: string;
  note?: string;
}

export interface GetCasesResponse {
  cases: Case[];
  total: number;
}

// =========== /api/portfolio/{wallet_address} ENDPOINT ===========

export interface PortfolioAsset {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  change24h: number;
  riskLevel: RiskLevel;
}

export interface PortfolioResponse {
  wallet_address: string;
  total_usd_value: number;
  assets: PortfolioAsset[];
  last_updated: string;
}

// =========== /api/transactions/history ENDPOINT ===========

export interface TransactionHistoryRequest {
  wallet_address: string;
  limit?: number;
  offset?: number;
}

export interface TransactionHistoryResponse {
  wallet_address: string;
  transactions: {
    hash: string;
    from: string;
    to: string;
    amount: number;
    symbol: string;
    status: string;
    timestamp: string;
    gas_metadata?: {
      gasUsed: string;
      gasPrice: string;
    };
  }[];
  total: number;
  limit: number;
  offset: number;
}

// =========== /api/logs/stream TYPE ===========

export interface LogEntry {
  message: string;
  type: "info" | "warning" | "alert" | "success" | "keepalive";
  timestamp: string;
  details?: any;
}

// =========== HELPER TYPES ===========

export interface RiskIndicator {
  label: string;
  value: string | number;
  severity: RiskLevel;
  description: string;
}

export const RISK_LEVEL_CONFIG: Record<
  RiskLevel,
  { color: string; bgColor: string; borderColor: string; label: string }
> = {
  low: {
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    label: "Low Risk",
  },
  medium: {
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    label: "Medium Risk",
  },
  high: {
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    label: "High Risk",
  },
  critical: {
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    label: "Critical Risk",
  },
};

export const TOKEN_RISK_LEVELS: Record<
  string,
  "normal" | "stablecoin" | "privacy"
> = {
  // Privacy coins - high risk
  XMR: "privacy",
  ZEC: "privacy",
  DASH: "privacy",
  BEAM: "privacy",
  // Stablecoins
  USDT: "stablecoin",
  USDC: "stablecoin",
  DAI: "stablecoin",
  BUSD: "stablecoin",
  // Normal
  BTC: "normal",
  ETH: "normal",
  SOL: "normal",
  ADA: "normal",
  MATIC: "normal",
};

export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 0.8) return "critical";
  if (score >= 0.6) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export function formatWalletAddress(
  address: string,
  length: number = 8,
): string {
  if (address.length <= length * 2 + 3) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

// Format currency as crypto (replaces USD formatting)
export function formatCurrency(value: number, identifier?: string): string {
  return formatCryptoAmount(value, identifier);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
