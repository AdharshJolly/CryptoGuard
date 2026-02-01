"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CryptocurrencySelector } from "@/components/ui/cryptocurrency-selector";
import { useWalletData } from "@/lib/wallet-service";
import { useAuth } from "@/providers/auth-provider";
import {
  Search,
  Filter,
  ExternalLink,
  Copy,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ExtendedTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  amount: number;
  type: "sent" | "received";
  status: "completed" | "pending" | "failed";
  timestamp: string;
  date: string;
  gasUsed: number;
  gasPrice: number;
  blockNumber: number;
  usdValue: number;
}

export default function TransactionsPage() {
  const [selectedCurrency, setSelectedCurrency] = useState("ETH");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { user } = useAuth();

  // Use real wallet address from authenticated user
  const walletAddress = user?.address || null;

  const {
    walletData,
    transactions,
    loading,
    transactionsLoading,
    error,
    refreshData,
  } = useWalletData(walletAddress || undefined);

  // Get active currencies from real wallet data
  const activeCurrencies = walletData?.balances || [];

  // Helper function to format transaction time
  const formatTransactionTime = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Convert real transactions to extended format
  const getAllTransactions = (): ExtendedTransaction[] => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const currentCurrencyData = activeCurrencies.find(
      (c) => c.symbol === selectedCurrency,
    );
    const price =
      currentCurrencyData && currentCurrencyData.balance > 0
        ? currentCurrencyData.usdValue / currentCurrencyData.balance
        : 0;

    return transactions.map((tx) => ({
      id: tx.hash,
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      amount: tx.value,
      type: tx.type,
      status: tx.status,
      timestamp: formatTransactionTime(tx.timestamp),
      date: new Date(tx.timestamp * 1000).toISOString().split("T")[0],
      gasUsed: tx.gasUsed,
      gasPrice: tx.gasPrice,
      blockNumber: tx.blockNumber,
      usdValue: tx.value * price,
    }));
  };

  const currentCurrency = activeCurrencies.find(
    (currency) => currency.symbol === selectedCurrency,
  );

  // Auto-select first available currency if selected currency doesn't exist
  React.useEffect(() => {
    if (activeCurrencies.length > 0 && !currentCurrency) {
      setSelectedCurrency(activeCurrencies[0].symbol);
    }
  }, [activeCurrencies, currentCurrency]);

  const allTransactions = getAllTransactions();

  // Filter transactions based on search and status
  const filteredTransactions = allTransactions.filter((tx) => {
    const matchesSearch =
      searchQuery === "" ||
      tx.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle loading state - show balance data immediately, transactions can load separately
  if (loading && !walletData) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-zinc-400">Connecting to wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Unable to load transactions
            </h3>
            <p className="text-zinc-400 mb-4">{error}</p>
            <Button
              onClick={refreshData}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-zinc-400" />;
    }
  };

  // Helper function to get the correct explorer URL based on network
  const getExplorerUrl = (hash: string) => {
    // Check if we are on Sepolia based on the balance symbols (e.g., "SepoliaETH")
    // or if we can derive it from walletData if it had network info
    const isSepolia = activeCurrencies.some(
      (c) => c.symbol.includes("Sepolia") || c.name.includes("Sepolia"),
    );

    const baseUrl = isSepolia
      ? "https://sepolia.etherscan.io/tx/"
      : "https://etherscan.io/tx/";

    return `${baseUrl}${hash}`;
  };

  // Helper function to copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Transactions</h1>
          <p className="text-zinc-400">
            View and manage your cryptocurrency transactions
          </p>
        </div>
        <Button
          onClick={refreshData}
          variant="outline"
          className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
        >
          Refresh
        </Button>
      </div>

      {/* Currency Selector */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Select Currency</CardTitle>
          <CardDescription className="text-zinc-400">
            Choose which currency transactions to display
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CryptocurrencySelector
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            currencies={activeCurrencies}
          />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="Search by hash, address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Recent Transactions</CardTitle>
              <CardDescription className="text-zinc-400">
                {transactionsLoading
                  ? "Loading transactions..."
                  : `${filteredTransactions.length} transaction(s) found`}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-zinc-300 border-zinc-600">
              {selectedCurrency}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Loading transactions...
              </h3>
              <p className="text-zinc-400">
                Balance data loaded. Fetching transaction history.
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No transactions found
              </h3>
              <p className="text-zinc-400">
                {allTransactions.length === 0
                  ? "No transactions available for this currency"
                  : "Try adjusting your search or filter criteria"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-teal-500 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {transaction.type === "received" ? (
                        <ArrowDownLeft className="w-5 h-5 text-green-400" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white capitalize">
                          {transaction.type}
                        </p>
                        {getStatusIcon(transaction.status)}
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            transaction.status === "completed"
                              ? "text-green-400 border-green-400/20"
                              : transaction.status === "pending"
                                ? "text-yellow-400 border-yellow-400/20"
                                : "text-red-400 border-red-400/20"
                          }`}
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-zinc-400">
                        <p className="flex items-center gap-2">
                          <span className="font-mono">
                            {transaction.type === "received" ? "From:" : "To:"}{" "}
                            {(transaction.type === "received"
                              ? transaction.from
                              : transaction.to
                            ).slice(0, 10)}
                            ...
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                transaction.type === "received"
                                  ? transaction.from
                                  : transaction.to,
                              )
                            }
                            className="text-zinc-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </p>
                        <p className="font-mono text-xs mt-1">
                          {transaction.hash.slice(0, 20)}...
                          <button
                            onClick={() => copyToClipboard(transaction.hash)}
                            className="ml-2 text-zinc-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">
                      {transaction.type === "received" ? "+" : "-"}
                      {transaction.amount.toFixed(4)} {selectedCurrency}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {transaction.amount.toFixed(6)} {selectedCurrency}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {transaction.timestamp}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
                        onClick={() =>
                          window.open(
                            getExplorerUrl(transaction.hash),
                            "_blank",
                          )
                        }
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Summary */}
      {filteredTransactions.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-green-400">
                  {
                    filteredTransactions.filter((tx) => tx.type === "received")
                      .length
                  }
                </p>
                <p className="text-sm text-zinc-400">Received</p>
              </div>
              <div className="text-center p-4 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-red-400">
                  {
                    filteredTransactions.filter((tx) => tx.type === "sent")
                      .length
                  }
                </p>
                <p className="text-sm text-zinc-400">Sent</p>
              </div>
              <div className="text-center p-4 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-yellow-400">
                  {
                    filteredTransactions.filter((tx) => tx.status === "pending")
                      .length
                  }
                </p>
                <p className="text-sm text-zinc-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
