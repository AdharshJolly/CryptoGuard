"use client";

import { useState } from "react";
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CryptocurrencySelector } from "@/components/ui/cryptocurrency-selector";
import { SendCurrency } from "@/components/ui/send-currency";
import { useWalletData, switchToSepolia } from "@/lib/wallet-service";
import { useAuth } from "@/providers/auth-provider";
import { formatPortfolioTotal } from "@/lib/api/crypto-types";
import {
  Wallet,
  TrendingUp,
  Activity,
  AlertCircle,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamic import for client-side only component
const TransactionGraph = dynamic(
  () =>
    import("@/components/visualizations/TransactionGraph").then((mod) => ({
      default: mod.TransactionGraph,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-gray-100 animate-pulse rounded-lg" />
    ),
  },
);

export default function DashboardPage() {
  const [selectedCurrency, setSelectedCurrency] = useState("ETH");
  const { user } = useAuth();

  // Use real wallet address from authenticated user
  const walletAddress = user?.address || null;

  const {
    walletData,
    transactions,
    loading: walletLoading,
    transactionsLoading,
    error: walletError,
    refreshData,
  } = useWalletData(walletAddress || undefined);

  // Get active currencies from real wallet data (show all currencies, even with 0 balance for testnet)
  const activeCurrencies = walletData?.balances || [];

  // Get the current currency data
  const currentCurrency = activeCurrencies.find(
    (currency: any) => currency.symbol === selectedCurrency,
  );

  // Calculate total portfolio value
  const totalPortfolioValue = walletData?.totalUsdValue || 0;

  // Auto-select first available currency if none selected or current selection doesn't exist
  React.useEffect(() => {
    if (activeCurrencies.length > 0 && !currentCurrency) {
      // Prefer testnet ETH if available, otherwise first currency
      const sepoliaETH = activeCurrencies.find(
        (c: any) => c.symbol === "SepoliaETH",
      );
      const firstCurrency = sepoliaETH || activeCurrencies[0];

      setSelectedCurrency(firstCurrency.symbol);
    }
  }, [activeCurrencies.length, !!currentCurrency]); // Stable dependencies to prevent loops

  if (!walletAddress) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <Wallet className="w-12 h-12 text-teal-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Wallet Not Connected
            </h3>
            <p className="text-zinc-400 mb-4">
              Please connect your wallet to view your dashboard.
            </p>
            <Button
              onClick={() => (window.location.href = "/")}
              className="bg-teal-primary hover:bg-teal-secondary"
            >
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (walletError) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Unable to load wallet data
            </h3>
            <p className="text-zinc-400 mb-4">{walletError}</p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={refreshData}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
                className="border-zinc-700 text-zinc-300"
              >
                Reconnect Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (walletLoading || !walletData) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-primary mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Loading wallet data...
            </h3>
            <p className="text-zinc-400">
              Connecting to blockchain and fetching your balances
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper functions for network operations
  const handleSwitchToSepolia = async () => {
    try {
      await switchToSepolia();
      // Refresh data after network switch
      setTimeout(() => {
        refreshData();
      }, 1000);
    } catch (error) {
      console.error("Failed to switch to Sepolia:", error);
    }
  };

  // Helper function to format transaction time
  const formatTransactionTime = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Filter transactions by selected currency (for ETH-based tokens)
  const getRecentTransactions = () => {
    console.log("Transactions available:", transactions.length);
    return transactions.map((tx) => ({
      id: tx.id,
      address:
        tx.type === "received"
          ? (tx.from?.slice(0, 4) || "0x??") +
            "..." +
            (tx.from?.slice(-3) || "???")
          : (tx.to?.slice(0, 4) || "0x??") +
            "..." +
            (tx.to?.slice(-3) || "???"),
      amount: tx.value,
      type: tx.type,
      time: formatTransactionTime(tx.timestamp),
      status: tx.status,
    }));
  };

  const recentTransactions = getRecentTransactions();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Currency Selector */}
      <Card className="financial-card border-teal-secondary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Wallet className="w-5 h-5 text-teal-primary" />
                <span className="font-script text-2xl text-teal-primary">
                  Wallet Balance
                </span>
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Address: {walletAddress?.slice(0, 6)}...
                {walletAddress?.slice(-4)}
                {walletData?.balances?.[0] &&
                  walletData.balances[0].name.includes("Sepolia") && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                      Testnet
                    </span>
                  )}
                {walletData?.balances?.[0] &&
                  !walletData.balances[0].name.includes("Sepolia") && (
                    <div className="mt-2">
                      <Button
                        onClick={handleSwitchToSepolia}
                        size="sm"
                        variant="outline"
                        className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20"
                      >
                        Switch to Sepolia Testnet
                      </Button>
                    </div>
                  )}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Portfolio</p>
              <p className="text-3xl font-bold text-teal-primary">
                {formatPortfolioTotal(totalPortfolioValue, activeCurrencies)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeCurrencies.map((currency: any) => (
              <div
                key={currency.symbol}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  currency.symbol === selectedCurrency
                    ? "bg-teal-500/10 border-teal-primary shadow-md"
                    : "bg-zinc-900/50 border-zinc-700 hover:border-teal-secondary hover:shadow-sm"
                }`}
                onClick={() => setSelectedCurrency(currency.symbol)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-teal-primary/20 text-teal-primary flex items-center justify-center text-sm font-bold">
                    {currency.symbol.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-100 text-sm">
                      {currency.symbol}
                    </h4>
                    <p className="text-xs text-zinc-400">{currency.name}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-teal-primary font-mono">
                    {currency.balance.toFixed(4)} {currency.symbol}
                  </p>
                  <p className="text-sm text-zinc-300">Balance</p>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        currency.riskLevel === "low"
                          ? "text-financial-success bg-green-500/10 border-financial-success/20"
                          : currency.riskLevel === "medium"
                            ? "text-financial-warning bg-yellow-500/10 border-financial-warning/20"
                            : "text-financial-danger bg-red-500/10 border-financial-danger/20"
                      }`}
                    >
                      {currency.riskLevel}
                    </Badge>
                    <span
                      className={`text-xs font-medium ${
                        currency.change24h >= 0
                          ? "text-financial-success"
                          : "text-financial-danger"
                      }`}
                    >
                      {currency.change24h >= 0 ? "+" : ""}
                      {currency.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Send Currency */}
      <SendCurrency
        activeCurrencies={activeCurrencies}
        onTransactionSent={(txHash) => {
          console.log("Transaction sent:", txHash);
          // Refresh wallet data after transaction
          refreshData();
        }}
      />

      {/* Transaction Log */}
      <Card className="financial-card border-teal-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-zinc-100">
            <span>Recent {selectedCurrency} Transactions</span>
            {currentCurrency?.riskLevel === "high" && (
              <AlertCircle className="w-4 h-4 text-financial-danger" />
            )}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {selectedCurrency} transfers and activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactionsLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">Loading transactions...</p>
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent transactions</p>
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-teal-secondary hover:bg-zinc-800 transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-mono text-zinc-300 group-hover:text-teal-primary transition-colors">
                      {transaction.address}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {transaction.time}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className={
                        transaction.type === "received"
                          ? "text-financial-success font-medium"
                          : "text-zinc-100 font-medium"
                      }
                    >
                      {transaction.type === "received" ? "+" : "-"}{" "}
                      {transaction.amount.toLocaleString()} {selectedCurrency}
                    </span>
                    {transaction.status === "pending" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 h-4 mt-1 text-financial-warning bg-yellow-50 border-financial-warning/20"
                      >
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-700">
            <Button
              variant="outline"
              className="w-full bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-teal-primary hover:border-teal-primary"
              onClick={() => (window.location.href = "/user/transactions")}
            >
              View All {selectedCurrency} Transactions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
