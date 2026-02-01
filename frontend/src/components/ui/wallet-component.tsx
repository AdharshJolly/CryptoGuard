"use client";

import { useState } from "react";
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
import { useWalletData, WalletBalance } from "@/lib/wallet-service";
import { formatPortfolioTotal } from "@/lib/api/crypto-types";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  AlertTriangle,
  Shield,
  Clock,
  Loader2,
} from "lucide-react";

interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  type: "sent" | "received";
  status: "pending" | "completed" | "failed";
  timestamp: string;
  gasUsed?: number;
  gasPrice?: number;
}

interface WalletComponentProps {
  className?: string;
  showPortfolioOverview?: boolean;
  compactMode?: boolean;
  walletAddress?: string;
}

export function WalletComponent({
  className = "",
  showPortfolioOverview = true,
  compactMode = false,
  walletAddress,
}: WalletComponentProps) {
  const [selectedCurrency, setSelectedCurrency] = useState("ETH");

  const { walletData, loading, error } = useWalletData(walletAddress);

  // Get active currencies from wallet data
  const activeCurrencies = walletData?.balances || [];

  // Get the current currency data
  const currentCurrency = activeCurrencies.find(
    (currency: WalletBalance) => currency.symbol === selectedCurrency,
  );

  // Calculate total portfolio value
  const totalPortfolioValue = walletData?.totalUsdValue || 0;

  // Mock recent transactions for the selected currency
  const getRecentTransactions = (currencySymbol: string): Transaction[] => {
    const baseTransactions = [
      {
        id: "1",
        hash: "0x1234...5678",
        from: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        amount: 2.45,
        type: "received" as const,
        status: "completed" as const,
        timestamp: "2 hours ago",
        gasUsed: 21000,
        gasPrice: 20,
      },
      {
        id: "2",
        hash: "0x8765...4321",
        from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        to: "0x84AF3D5d49D64E57DBd6FBB21dF7202bD3EE7A22",
        amount: 1.2,
        type: "sent" as const,
        status: "completed" as const,
        timestamp: "5 hours ago",
        gasUsed: 21000,
        gasPrice: 25,
      },
      {
        id: "3",
        hash: "0xabcd...ef12",
        from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        to: "0x92C7656EC7ab88b098defB751B7401B5f6d8976F",
        amount: 0.75,
        type: "sent" as const,
        status: "pending" as const,
        timestamp: "1 day ago",
        gasUsed: 21000,
        gasPrice: 18,
      },
      {
        id: "4",
        hash: "0x3456...7890",
        from: "0xA5C7656EC7ab88b098defB751B7401B5f6d8976F",
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        amount: 3.1,
        type: "received" as const,
        status: "completed" as const,
        timestamp: "2 days ago",
        gasUsed: 21000,
        gasPrice: 22,
      },
      {
        id: "5",
        hash: "0x6789...0123",
        from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        to: "0xB8C7656EC7ab88b098defB751B7401B5f6d8976F",
        amount: 0.95,
        type: "sent" as const,
        status: "failed" as const,
        timestamp: "3 days ago",
        gasUsed: 0,
        gasPrice: 30,
      },
    ];

    return baseTransactions.map((tx) => ({
      ...tx,
      currency: currencySymbol,
      amount:
        currencySymbol === "ETH"
          ? tx.amount
          : currencySymbol === "BTC"
            ? tx.amount * 0.05
            : currencySymbol === "USDT"
              ? tx.amount * 3000
              : currencySymbol === "USDC"
                ? tx.amount * 3000
                : currencySymbol === "SOL"
                  ? tx.amount * 100
                  : currencySymbol === "ADA"
                    ? tx.amount * 1000
                    : tx.amount,
    }));
  };

  const recentTransactions = getRecentTransactions(selectedCurrency);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You might want to show a toast notification here
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Shield className="w-3 h-3 text-emerald-400" />;
      case "pending":
        return <Clock className="w-3 h-3 text-yellow-400" />;
      case "failed":
        return <AlertTriangle className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <Card className={`bg-zinc-900 border-zinc-800 ${className}`}>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-zinc-400">Loading wallet data...</p>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card className={`bg-zinc-900 border-zinc-800 ${className}`}>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">Unable to load wallet data</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Handle empty wallet
  if (!activeCurrencies.length) {
    return (
      <Card className={`bg-zinc-900 border-zinc-800 ${className}`}>
        <CardContent className="p-8 text-center">
          <Wallet className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No Cryptocurrencies Found
          </h3>
          <p className="text-zinc-400">
            Your wallet appears to be empty or unable to load balances.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compactMode) {
    return (
      <Card className={`bg-zinc-900 border-zinc-800 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Wallet</CardTitle>
          <CardDescription>Select and view your cryptocurrency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CryptocurrencySelector
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            currencies={activeCurrencies}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Portfolio Value</span>
            <span className="text-lg font-bold text-white">
              {formatPortfolioTotal(totalPortfolioValue, activeCurrencies)}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Wallet Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Cryptocurrency Wallet
              </CardTitle>
              <CardDescription>
                Select and manage your digital assets
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">Total Portfolio</p>
              <p className="text-3xl font-bold text-white">
                {formatPortfolioTotal(totalPortfolioValue, activeCurrencies)}
              </p>
              <p className="text-xs text-zinc-500">
                {activeCurrencies.length} active currencies
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CryptocurrencySelector
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            currencies={activeCurrencies}
          />
        </CardContent>
      </Card>

      {/* Portfolio Overview */}
      {showPortfolioOverview && activeCurrencies.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Portfolio Holdings
            </CardTitle>
            <CardDescription>
              All cryptocurrencies with active balances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCurrencies.map((currency) => (
                <div
                  key={currency.symbol}
                  className={`p-4 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${
                    currency.symbol === selectedCurrency
                      ? "bg-zinc-800 border-blue-500/50 ring-1 ring-blue-500/20"
                      : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                  }`}
                  onClick={() => setSelectedCurrency(currency.symbol)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {currency.icon}
                    <div>
                      <h4 className="font-semibold text-white">
                        {currency.symbol}
                      </h4>
                      <p className="text-xs text-zinc-400">{currency.name}</p>
                    </div>
                    {currency.symbol === selectedCurrency && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-blue-400 bg-blue-400/10 border-blue-400/20"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-bold text-white font-mono">
                        {currency.balance.toLocaleString()}
                      </p>
                      <span
                        className={`text-sm font-medium flex items-center gap-1 ${
                          currency.change24h >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {currency.change24h >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(currency.change24h)}%
                      </span>
                    </div>
                    <p className="text-base text-zinc-300 font-medium">
                      {currency.balance.toFixed(4)} {currency.symbol}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          currency.riskLevel === "low"
                            ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                            : currency.riskLevel === "medium"
                              ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                              : "text-red-400 bg-red-400/10 border-red-400/20"
                        }`}
                      >
                        {currency.riskLevel} risk
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs text-zinc-400 bg-zinc-400/10"
                      >
                        {currency.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5" />
                Recent {selectedCurrency} Transactions
              </CardTitle>
              <CardDescription>
                Latest activity for {currentCurrency?.name}
              </CardDescription>
            </div>
            {currentCurrency?.riskLevel === "high" && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">High Risk Currency</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      transaction.type === "received"
                        ? "bg-emerald-400/10 text-emerald-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {transaction.type === "received" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-zinc-300 group-hover:text-white transition-colors">
                        {transaction.type === "received"
                          ? `${transaction.from.substring(0, 6)}...${transaction.from.substring(38)}`
                          : `${transaction.to.substring(0, 6)}...${transaction.to.substring(38)}`}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            transaction.type === "received"
                              ? transaction.from
                              : transaction.to,
                          )
                        }
                        className="text-zinc-500 hover:text-zinc-300"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button className="text-zinc-500 hover:text-zinc-300">
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{transaction.timestamp}</span>
                      {getStatusIcon(transaction.status)}
                      <span className="capitalize">{transaction.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className={`text-base font-medium font-mono ${
                      transaction.type === "received"
                        ? "text-emerald-400"
                        : transaction.status === "failed"
                          ? "text-red-400"
                          : "text-white"
                    }`}
                  >
                    {transaction.type === "received" ? "+" : "-"}{" "}
                    {transaction.amount.toLocaleString()} {selectedCurrency}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Hash: {transaction.hash.substring(0, 10)}...
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-zinc-950 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              onClick={() => (window.location.href = "/user/transactions")}
            >
              View All Transactions
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                // Add send functionality
                console.log("Send", selectedCurrency);
              }}
            >
              Send {selectedCurrency}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
