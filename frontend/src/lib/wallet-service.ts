import { useState, useEffect } from "react";
import { ethers } from "ethers";

// MetaMask window interface
interface WindowEthereum {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: WindowEthereum;
  }
}

export interface WalletBalance {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  contractAddress?: string;
  decimals: number;
  riskLevel: "low" | "medium" | "high";
  change24h: number;
  category: "major" | "stablecoin" | "privacy" | "defi";
  icon?: string;
}

export interface WalletData {
  address: string;
  balances: WalletBalance[];
  totalUsdValue: number;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  type: "sent" | "received";
  status: "completed" | "pending" | "failed";
  timestamp: number;
  blockNumber: number;
  gasUsed: number;
  gasPrice: number;
}

// Known token contracts on Ethereum mainnet
const TOKEN_CONTRACTS = {
  USDC: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    symbol: "USDC",
    name: "USD Coin",
    category: "stablecoin" as const,
    riskLevel: "low" as const,
  },
  USDT: {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    symbol: "USDT",
    name: "Tether USD",
    category: "stablecoin" as const,
    riskLevel: "medium" as const,
  },
  DAI: {
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    symbol: "DAI",
    name: "Dai Stablecoin",
    category: "stablecoin" as const,
    riskLevel: "low" as const,
  },
  WBTC: {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    category: "major" as const,
    riskLevel: "low" as const,
  },
};

// ERC-20 ABI (minimal for balance checking)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// Real Web3 wallet service
class WalletService {
  private static instance: WalletService;
  private cache: Map<string, WalletData> = new Map();
  private transactionCache: Map<string, Transaction[]> = new Map();
  private priceCache: Map<
    string,
    { price: number; change24h: number; timestamp: number }
  > = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly TRANSACTION_CACHE_DURATION = 60000; // 1 minute
  private readonly PRICE_CACHE_DURATION = 300000; // 5 minutes
  private provider: ethers.BrowserProvider | null = null;

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
      WalletService.instance.loadCache();
    }
    return WalletService.instance;
  }

  // Load cache from localStorage
  private loadCache() {
    if (typeof window === "undefined") return;
    try {
      const storedCache = localStorage.getItem("crypto_guard_wallet_cache");
      if (storedCache) {
        const parsed = JSON.parse(storedCache);
        this.cache = new Map(Object.entries(parsed.walletData || {}));
        this.transactionCache = new Map(
          Object.entries(parsed.transactions || {}),
        );
      }
    } catch (e) {
      console.error("Failed to load wallet cache", e);
    }
  }

  // Save cache to localStorage
  private saveCache() {
    if (typeof window === "undefined") return;
    try {
      const data = {
        walletData: Object.fromEntries(this.cache),
        transactions: Object.fromEntries(this.transactionCache),
      };
      localStorage.setItem("crypto_guard_wallet_cache", JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save wallet cache", e);
    }
  }

  private async getProvider(): Promise<ethers.BrowserProvider> {
    if (!window.ethereum) {
      throw new Error(
        "MetaMask is not installed. Please install MetaMask to continue.",
      );
    }

    if (!this.provider) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
    return this.provider;
  }

  // Force refresh provider to get current network state
  private async refreshProvider(): Promise<void> {
    if (window.ethereum) {
      this.provider = null; // Clear cached provider
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
  }

  private async getNetworkInfo(): Promise<{
    name: string;
    chainId: number;
    isTestnet: boolean;
  }> {
    try {
      // Get chain ID directly from MetaMask first
      const chainIdHex = (await window.ethereum?.request({
        method: "eth_chainId",
      })) as string;
      const chainIdFromMM = parseInt(chainIdHex, 16);

      console.log("MetaMask Chain ID:", chainIdFromMM, "Hex:", chainIdHex);

      const networkMap: Record<number, { name: string; isTestnet: boolean }> = {
        1: { name: "Ethereum Mainnet", isTestnet: false },
        11155111: { name: "Sepolia", isTestnet: true },
        5: { name: "Goerli", isTestnet: true },
        137: { name: "Polygon", isTestnet: false },
        80001: { name: "Mumbai", isTestnet: true },
      };

      const networkInfo = networkMap[chainIdFromMM] || {
        name: `Unknown (${chainIdFromMM})`,
        isTestnet: true,
      };
      console.log("Detected network:", networkInfo);

      return { ...networkInfo, chainId: chainIdFromMM };
    } catch (error) {
      console.error("Failed to get network info:", error);
      // Fallback to provider method
      const provider = await this.getProvider();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      const networkMap: Record<number, { name: string; isTestnet: boolean }> = {
        1: { name: "Ethereum Mainnet", isTestnet: false },
        11155111: { name: "Sepolia", isTestnet: true },
        5: { name: "Goerli", isTestnet: true },
        137: { name: "Polygon", isTestnet: false },
      };

      const networkInfo = networkMap[chainId] || {
        name: "Unknown",
        isTestnet: true,
      };
      return { ...networkInfo, chainId };
    }
  }

  private async getCryptoPrice(
    symbol: string,
  ): Promise<{ price: number; change24h: number }> {
    // Check price cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_DURATION) {
      return { price: cached.price, change24h: cached.change24h };
    }

    try {
      // Reduce timeout for faster fallback
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${this.getCoinGeckoId(symbol)}&vs_currencies=usd&include_24hr_change=true`,
        {
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const coinData = data[this.getCoinGeckoId(symbol)];

      if (!coinData) {
        // Fallback prices if API fails
        return this.getFallbackPrice(symbol);
      }

      const result = {
        price: coinData.usd || 0,
        change24h: coinData.usd_24h_change || 0,
      };

      // Cache the result
      this.priceCache.set(symbol, { ...result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.warn(`Failed to fetch price for ${symbol}:`, error);
      return this.getFallbackPrice(symbol);
    }
  }

  private getCoinGeckoId(symbol: string): string {
    const mapping: Record<string, string> = {
      ETH: "ethereum",
      USDC: "usd-coin",
      USDT: "tether",
      DAI: "dai",
      WBTC: "wrapped-bitcoin",
    };
    return mapping[symbol] || symbol.toLowerCase();
  }

  private getFallbackPrice(symbol: string): {
    price: number;
    change24h: number;
  } {
    const fallbackPrices: Record<string, { price: number; change24h: number }> =
      {
        ETH: { price: 3000, change24h: 2.4 },
        USDC: { price: 1.0, change24h: -0.01 },
        USDT: { price: 1.0, change24h: 0.02 },
        DAI: { price: 1.0, change24h: 0.01 },
        WBTC: { price: 100000, change24h: 1.8 },
      };
    return fallbackPrices[symbol] || { price: 0, change24h: 0 };
  }

  async fetchWalletBalances(walletAddress: string): Promise<WalletData> {
    // Check cache first
    const cached = this.cache.get(walletAddress);
    if (
      cached &&
      Date.now() - new Date(cached.lastUpdated).getTime() < this.CACHE_DURATION
    ) {
      return cached;
    }

    try {
      // Get provider and network info in parallel
      const [provider, networkInfo] = await Promise.all([
        this.getProvider(),
        this.getNetworkInfo(),
      ]);

      const balances: WalletBalance[] = [];

      console.log(
        `Fetching balances for ${walletAddress} on ${networkInfo.name} (Chain ID: ${networkInfo.chainId})`,
      );

      // Get ETH balance and price data in parallel
      const [ethBalance, ethPriceData] = await Promise.all([
        provider.getBalance(walletAddress),
        networkInfo.isTestnet
          ? Promise.resolve(this.getFallbackPrice("ETH"))
          : this.getCryptoPrice("ETH"),
      ]);

      const ethAmount = parseFloat(ethers.formatEther(ethBalance));
      console.log(`ETH Balance: ${ethAmount} on ${networkInfo.name}`);

      const tokenName = networkInfo.isTestnet
        ? `${networkInfo.name} ETH`
        : "Ethereum";
      const tokenSymbol = networkInfo.isTestnet
        ? `${networkInfo.name}ETH`
        : "ETH";

      console.log(`Adding token: ${tokenSymbol} with balance: ${ethAmount}`);

      balances.push({
        symbol: tokenSymbol,
        name: tokenName,
        balance: ethAmount,
        usdValue: networkInfo.isTestnet
          ? 0
          : ethAmount * ethPriceData.price,
        decimals: 18,
        riskLevel: "low",
        change24h: ethPriceData.change24h,
        category: "major",
      });

      // Skip token balance checks for testnets and speed optimization
      // Only check major tokens on mainnet, and do it in parallel
      if (!networkInfo.isTestnet && networkInfo.chainId === 1) {
        console.log("Checking token balances in parallel...");

        // Check only major tokens in parallel to avoid slow loading
        const tokenChecks = Object.entries(TOKEN_CONTRACTS)
          .slice(0, 3) // Only check top 3 tokens for speed
          .map(async ([tokenSymbol, tokenInfo]) => {
            try {
              const contract = new ethers.Contract(
                tokenInfo.address,
                ERC20_ABI,
                provider,
              );

              // Set a timeout for each token check
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Token check timeout")),
                  3000,
                ),
              );

              const balance = (await Promise.race([
                contract.balanceOf(walletAddress),
                timeoutPromise,
              ])) as any;

              const tokenAmount = parseFloat(
                ethers.formatUnits(balance, tokenInfo.decimals),
              );

              if (tokenAmount > 0.01) {
                // Only include tokens with meaningful balances
                const priceData = await this.getCryptoPrice(tokenInfo.symbol);
                return {
                  symbol: tokenInfo.symbol,
                  name: tokenInfo.name,
                  balance: tokenAmount,
                  usdValue: tokenAmount * priceData.price,
                  contractAddress: tokenInfo.address,
                  decimals: tokenInfo.decimals,
                  riskLevel: tokenInfo.riskLevel,
                  change24h: priceData.change24h,
                  category: tokenInfo.category,
                };
              }
            } catch (error) {
              console.warn(
                `Failed to fetch balance for ${tokenSymbol}:`,
                error,
              );
            }
            return null;
          });

        // Wait for all token checks with a maximum timeout
        const tokenResults = await Promise.allSettled(tokenChecks);
        tokenResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            balances.push(result.value);
          }
        });
      }

      const totalUsdValue = balances.reduce(
        (sum, balance) => sum + balance.usdValue,
        0,
      );

      const walletData: WalletData = {
        address: walletAddress,
        balances,
        totalUsdValue,
        lastUpdated: new Date().toISOString(),
      };

      this.cache.set(walletAddress, walletData);
      this.saveCache(); // Save to local storage
      return walletData;
    } catch (error) {
      console.error("Failed to fetch wallet balances:", error);
      throw new Error(
        "Failed to connect to wallet. Please ensure MetaMask is connected and try again.",
      );
    }
  }

  // Method to refresh wallet data
  async refreshWalletData(walletAddress: string): Promise<WalletData> {
    this.cache.delete(walletAddress);
    return this.fetchWalletBalances(walletAddress);
  }

  // Connect to MetaMask and get current account
  async connectWallet(): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }

      const provider = await this.getProvider();

      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      return address;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw new Error(
        "Failed to connect to MetaMask. Please ensure it is installed and unlocked.",
      );
    }
  }

  // Check if MetaMask is installed
  isMetaMaskInstalled(): boolean {
    return typeof window !== "undefined" && !!window.ethereum;
  }

  // Request switch to Sepolia testnet
  async switchToSepolia(): Promise<void> {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // Sepolia chain ID in hex
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia Testnet",
                rpcUrls: ["https://sepolia.infura.io/v3/"],
                nativeCurrency: {
                  name: "SepoliaETH",
                  symbol: "SepoliaETH",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://sepolia.etherscan.io/"],
              },
            ],
          });
        } catch (addError) {
          throw new Error("Failed to add Sepolia network to MetaMask");
        }
      } else {
        throw new Error("Failed to switch to Sepolia network");
      }
    }

    // Clear cached provider after network switch
    this.provider = null;
  }

  // Send transaction
  async sendTransaction(
    to: string,
    amount: string,
    tokenAddress?: string,
  ): Promise<string> {
    try {
      const provider = await this.getProvider();
      const signer = await provider.getSigner();
      const fromAddress = await signer.getAddress();

      let transaction;

      if (tokenAddress) {
        // ERC-20 token transfer
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const decimals = await contract.decimals();
        const amountWei = ethers.parseUnits(amount, decimals);

        transaction = await contract.transfer(to, amountWei);
      } else {
        // ETH transfer
        const amountWei = ethers.parseEther(amount);

        transaction = await signer.sendTransaction({
          to,
          value: amountWei,
        });
      }

      console.log(`Transaction sent: ${transaction.hash}`);
      return transaction.hash;
    } catch (error: any) {
      console.error("Failed to send transaction:", error);
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  // Get current connected account (if any)
  async getCurrentAccount(): Promise<string | null> {
    try {
      if (!this.isMetaMaskInstalled()) return null;

      if (!window.ethereum) return null;

      const accounts = (await window.ethereum.request({
        method: "eth_accounts",
      })) as string[];

      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error("Failed to get current account:", error);
      return null;
    }
  }

  // Fetch recent transactions for an address (optimized with caching)
  async fetchRecentTransactions(
    walletAddress: string,
    limit: number = 10,
    forceRefresh: boolean = false,
  ): Promise<Transaction[]> {
    // Check transaction cache first
    const cacheKey = `${walletAddress}-${limit}`;
    const cached = this.transactionCache.get(cacheKey);
    if (cached && !forceRefresh) {
      console.log("Using cached transactions");
      return cached;
    }

    try {
      const networkInfo = await this.getNetworkInfo();
      console.log(
        `Fetching real transactions for ${walletAddress} from ${networkInfo.name}`,
      );

      let transactions: Transaction[] = [];

      if (networkInfo.chainId === 1 || networkInfo.chainId === 11155111) {
        // Mainnet OR Sepolia - use Etherscan API
        transactions = await this.fetchEtherscanTransactions(
          walletAddress,
          limit,
          networkInfo.chainId,
        );
      } else {
        // Other networks - try direct blockchain queries
        transactions = await this.fetchDirectTransactions(walletAddress, limit);
      }

      // Cache the results
      this.transactionCache.set(cacheKey, transactions);
      this.saveCache(); // Save to local storage
      setTimeout(
        () => this.transactionCache.delete(cacheKey),
        this.TRANSACTION_CACHE_DURATION,
      );

      console.log(`Found ${transactions.length} real transactions`);
      return transactions;
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      // Return empty array instead of mock data
      return [];
    }
  }

  // Fetch transactions using Etherscan API (for mainnet and sepolia)
  private async fetchEtherscanTransactions(
    walletAddress: string,
    limit: number,
    chainId: number,
  ): Promise<Transaction[]> {
    try {
      const baseUrl =
        chainId === 11155111
          ? "https://api-sepolia.etherscan.io/api"
          : "https://api.etherscan.io/api";

      const apiKey =
        process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || "YourApiKeyToken";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        // Using free Etherscan API (rate limited but works for basic usage)
        const response = await fetch(
          `${baseUrl}?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`,
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Etherscan API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== "1" || !data.result) {
          console.warn(
            "No transactions found from Etherscan API or API error:",
            data.message,
          );
          // Fallback to direct fetch if API fails (e.g. rate limit)
          return this.fetchDirectTransactions(walletAddress, limit);
        }

        return data.result.slice(0, limit).map((tx: any) => ({
          id: tx.hash,
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: parseFloat(ethers.formatEther(tx.value)),
          type:
            tx.from.toLowerCase() === walletAddress.toLowerCase()
              ? "sent"
              : "received",
          status: tx.isError === "0" ? "completed" : "failed",
          timestamp: parseInt(tx.timeStamp),
          blockNumber: parseInt(tx.blockNumber),
          gasUsed: parseInt(tx.gasUsed),
          gasPrice: parseInt(tx.gasPrice),
        }));
      } catch (innerError) {
        clearTimeout(timeoutId);
        throw innerError;
      }
    } catch (error) {
      console.error("Etherscan API failed, falling back to direct:", error);
      return this.fetchDirectTransactions(walletAddress, limit);
    }
  }

  // Fetch transactions using direct blockchain queries (for testnets) - optimized
  private async fetchDirectTransactions(
    walletAddress: string,
    limit: number,
  ): Promise<Transaction[]> {
    try {
      const provider = await this.getProvider();
      const currentBlock = await provider.getBlockNumber();
      const transactions: Transaction[] = [];

      // Check last 500 blocks (optimized from 100 to increase coverage, batched)
      const blocksToCheck = 500;
      console.log(`Checking last ${blocksToCheck} blocks for transactions...`);

      // Process blocks in batches
      const batchSize = 25; // Increased batch size for speed
      for (
        let i = 0;
        i < blocksToCheck && transactions.length < limit;
        i += batchSize
      ) {
        const batch = [];

        // Create batch of block fetch promises with prefetchTxs = true
        for (let j = 0; j < batchSize && i + j < blocksToCheck; j++) {
          const blockNumber = currentBlock - (i + j);
          batch.push(provider.getBlock(blockNumber, true));
        }

        // Process batch of blocks in parallel
        const blockResults = await Promise.allSettled(batch);

        for (const result of blockResults) {
          if (result.status === "fulfilled" && result.value) {
            const block = result.value;
            const rawTxs = block.prefetchedTransactions || block.transactions;

            if (rawTxs && rawTxs.length > 0) {
              // 1. Identify which TXs need fetching (strings) vs which are ready (objects)
              const txsToProcess: any[] = [];
              const txsToFetch: string[] = [];

              for (const tx of rawTxs) {
                if (typeof tx === "string") {
                  txsToFetch.push(tx);
                } else {
                  txsToProcess.push(tx);
                }
              }

              // 2. Fetch missing transaction details in parallel
              if (txsToFetch.length > 0) {
                const fetchPromises = txsToFetch.map((hash) =>
                  provider.getTransaction(hash).catch(() => null),
                );
                const fetchedTxs = await Promise.all(fetchPromises);
                fetchedTxs.forEach((tx) => {
                  if (tx) txsToProcess.push(tx);
                });
              }

              // 3. Process all full transaction objects
              for (const tx of txsToProcess) {
                if (transactions.length >= limit) break;

                try {
                  if (!tx.from) continue;

                  // Check if this transaction involves our wallet address
                  // Note: tx.to can be null for contract creations
                  if (
                    tx.from.toLowerCase() === walletAddress.toLowerCase() ||
                    (tx.to &&
                      tx.to.toLowerCase() === walletAddress.toLowerCase())
                  ) {
                    transactions.push({
                      id: tx.hash,
                      hash: tx.hash,
                      from: tx.from,
                      to: tx.to || "",
                      value: parseFloat(ethers.formatEther(tx.value || "0")),
                      type:
                        tx.from.toLowerCase() === walletAddress.toLowerCase()
                          ? "sent"
                          : "received",
                      status: "completed",
                      timestamp: block.timestamp,
                      blockNumber: block.number,
                      gasUsed: 21000,
                      gasPrice: parseInt(tx.gasPrice?.toString() || "0"),
                    });
                  }
                } catch (txError) {
                  continue;
                }
              }
            }
          }
        }
      }

      // Sort by timestamp (newest first)
      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error("Direct blockchain query failed:", error);
      return [];
    }
  }
}

// React hook for wallet data - optimized for immediate balance display
export function useWalletData(walletAddress?: string) {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletService = WalletService.getInstance();

  const fetchData = async (address: string) => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      // First, fetch and display wallet balance immediately
      console.log("🚀 Fetching wallet balance data...");
      const data = await walletService.fetchWalletBalances(address);
      setWalletData(data);
      setLoading(false);
      console.log("✅ Wallet balance loaded, showing UI");

      // Then fetch transactions separately without blocking UI
      setTransactionsLoading(true);
      console.log("🔄 Fetching transactions in background...");
      const txs = await walletService.fetchRecentTransactions(address, 10);
      setTransactions(txs);
      setTransactionsLoading(false);
      console.log("✅ Transactions loaded");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch wallet data",
      );
      setWalletData(null);
      setTransactions([]);
      setLoading(false);
      setTransactionsLoading(false);
    }
  };

  const refreshData = async () => {
    if (!walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      // Refresh balance data first
      const data = await walletService.refreshWalletData(walletAddress);
      setWalletData(data);
      setLoading(false);

      // Then refresh transactions - FORCE REFRESH
      setTransactionsLoading(true);
      // We need to implement force refresh in fetchRecentTransactions
      const txs = await walletService.fetchRecentTransactions(
        walletAddress,
        10,
        true // Force refresh
      );
      setTransactions(txs);
      setTransactionsLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh wallet data",
      );
      setLoading(false);
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchData(walletAddress);
    }
  }, [walletAddress]);

  return {
    walletData,
    transactions,
    loading,
    transactionsLoading,
    error,
    refreshData,
  };
}

// Helper function to get current user's wallet address
export async function getCurrentWalletAddress(): Promise<string | null> {
  const walletService = WalletService.getInstance();
  return await walletService.getCurrentAccount();
}

// Helper function to connect wallet
export async function connectWallet(): Promise<string> {
  const walletService = WalletService.getInstance();
  return await walletService.connectWallet();
}

// Helper function to switch to Sepolia testnet
export async function switchToSepolia(): Promise<void> {
  const walletService = WalletService.getInstance();
  return await walletService.switchToSepolia();
}

// Helper function to send transaction
export async function sendTransaction(
  to: string,
  amount: string,
  tokenAddress?: string,
): Promise<string> {
  const walletService = WalletService.getInstance();
  return await walletService.sendTransaction(to, amount, tokenAddress);
}

export default WalletService;