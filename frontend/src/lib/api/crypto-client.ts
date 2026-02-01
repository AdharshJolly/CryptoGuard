// ================================
// CRYPTO AML API CLIENT
// ================================

import {
  PredictRequest,
  PredictResponse,
  WalletAnalysisRequest,
  WalletAnalysisResponse,
  BatchAnalyzeRequest,
  BatchAnalyzeResponse,
  SmurfingDetectionRequest,
  SmurfingDetectionResponse,
  VisualizeRequest,
  VisualizeResponse,
  ExplainSuspicionRequest,
  ExplainSuspicionResponse,
  DashboardMetricsResponse,
  GetCasesResponse,
  CreateCaseRequest,
  UpdateCaseRequest,
  Case,
  PortfolioResponse,
  TransactionHistoryRequest,
  TransactionHistoryResponse,
} from "./crypto-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

class CryptoApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Enhanced prediction combining ML models with crypto-specific analysis
   */
  async predict(data: PredictRequest): Promise<PredictResponse> {
    return this.request<PredictResponse>("/predict", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Comprehensive wallet analysis with graph-based smurfing/layering detection
   */
  async analyzeWallet(
    data: WalletAnalysisRequest,
  ): Promise<WalletAnalysisResponse> {
    return this.request<WalletAnalysisResponse>("/crypto/analyze-wallet", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Batch analysis of multiple wallets in a transaction graph
   */
  async batchAnalyze(data: BatchAnalyzeRequest): Promise<BatchAnalyzeResponse> {
    return this.request<BatchAnalyzeResponse>("/crypto/batch-analyze", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Specialized smurfing/layering pattern detection
   */
  async detectSmurfing(
    data: SmurfingDetectionRequest,
  ): Promise<SmurfingDetectionResponse> {
    return this.request<SmurfingDetectionResponse>("/crypto/detect-smurfing", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get visualization-ready graph data (for D3.js/vis.js)
   */
  async getVisualization(data: VisualizeRequest): Promise<VisualizeResponse> {
    return this.request<VisualizeResponse>("/crypto/visualize", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get AI-powered explanation of wallet suspicion
   */
  async explainSuspicion(
    data: ExplainSuspicionRequest,
  ): Promise<ExplainSuspicionResponse> {
    return this.request<ExplainSuspicionResponse>("/crypto/explain-suspicion", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Get aggregated system metrics for admin dashboard
   */
  async getDashboardMetrics(): Promise<DashboardMetricsResponse> {
    return this.request<DashboardMetricsResponse>("/api/dashboard/metrics", {
      method: "GET",
    });
  }

  /**
   * Get all investigation cases
   */
  async getCases(status?: string): Promise<GetCasesResponse> {
    const query = status ? `?status=${status}` : "";
    return this.request<GetCasesResponse>(`/api/cases${query}`, {
      method: "GET",
    });
  }

  /**
   * Get specific case details
   */
  async getCase(caseId: string): Promise<Case> {
    return this.request<Case>(`/api/cases/${caseId}`, {
      method: "GET",
    });
  }

  /**
   * Create a new investigation case
   */
  async createCase(data: CreateCaseRequest): Promise<Case> {
    return this.request<Case>("/api/cases", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update case status or add notes
   */
  async updateCase(caseId: string, data: UpdateCaseRequest): Promise<Case> {
    return this.request<Case>(`/api/cases/${caseId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a case
   */
  async deleteCase(caseId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/cases/${caseId}`, {
      method: "DELETE",
    });
  }

  /**
   * Get portfolio holdings for a wallet
   */
  async getPortfolio(walletAddress: string): Promise<PortfolioResponse> {
    return this.request<PortfolioResponse>(`/api/portfolio/${walletAddress}`, {
      method: "GET",
    });
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(
    data: TransactionHistoryRequest,
  ): Promise<TransactionHistoryResponse> {
    return this.request<TransactionHistoryResponse>(
      "/api/transactions/history",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }
}

// Export singleton instance
export const cryptoApi = new CryptoApiClient();

// Export class for custom instances
export { CryptoApiClient };
