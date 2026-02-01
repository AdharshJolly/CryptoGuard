"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendTransaction, WalletBalance } from "@/lib/wallet-service";
import {
  Send,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Wallet,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SendCurrencyProps {
  activeCurrencies: WalletBalance[];
  onTransactionSent?: (txHash: string) => void;
}

export function SendCurrency({
  activeCurrencies,
  onTransactionSent,
}: SendCurrencyProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(
    activeCurrencies[0]?.symbol || "",
  );
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCurrencyData = activeCurrencies.find(
    (c) => c.symbol === selectedCurrency,
  );

  const handleSend = async () => {
    if (!recipientAddress || !amount || !selectedCurrencyData) {
      setError("Please fill in all fields");
      return;
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      setError("Invalid recipient address");
      return;
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Invalid amount");
      return;
    }

    if (numAmount > selectedCurrencyData.balance) {
      setError("Insufficient balance");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // For ETH (including testnet ETH), don't pass token address
      const isETH = selectedCurrencyData.symbol.includes("ETH");
      const tokenAddress = isETH
        ? undefined
        : selectedCurrencyData.contractAddress;

      const txHash = await sendTransaction(
        recipientAddress,
        amount,
        tokenAddress,
      );

      setSuccess(
        `Transaction sent successfully! Hash: ${txHash.slice(0, 10)}...`,
      );
      setRecipientAddress("");
      setAmount("");

      if (onTransactionSent) {
        onTransactionSent(txHash);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send transaction");
    } finally {
      setLoading(false);
    }
  };

  if (activeCurrencies.length === 0) {
    return (
      <Card className="financial-card border-teal-secondary/20">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">
            No Assets Available
          </h3>
          <p className="text-zinc-400">
            Add funds to your wallet to start sending.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="financial-card border-teal-secondary/20 overflow-hidden">
      <CardHeader className="border-b border-zinc-800/50 bg-zinc-900/50 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <div className="p-2 rounded-lg bg-teal-primary/10">
                <Send className="w-5 h-5 text-teal-primary" />
              </div>
              Transfer Assets
            </CardTitle>
            <CardDescription className="text-zinc-400 ml-11">
              Send crypto securely to any address
            </CardDescription>
          </div>
          {selectedCurrencyData && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs px-3 py-1 bg-zinc-900",
                selectedCurrencyData.riskLevel === "low"
                  ? "text-emerald-400 border-emerald-400/20"
                  : selectedCurrencyData.riskLevel === "medium"
                    ? "text-amber-400 border-amber-400/20"
                    : "text-red-400 border-red-400/20",
              )}
            >
              Network Status: Optimal
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Asset Selection */}
          <div className="lg:col-span-5 space-y-4">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider ml-1">
              Select Asset
            </label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {activeCurrencies.map((currency) => (
                <button
                  key={currency.symbol}
                  onClick={() => {
                    setSelectedCurrency(currency.symbol);
                    setError(null);
                  }}
                  className={cn(
                    "w-full p-3 rounded-xl border transition-all duration-200 group relative overflow-hidden text-left",
                    selectedCurrency === currency.symbol
                      ? "bg-teal-900/10 border-teal-primary/50 shadow-[0_0_15px_-5px_rgba(13,148,136,0.3)]"
                      : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800",
                  )}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                          selectedCurrency === currency.symbol
                            ? "bg-teal-primary text-white"
                            : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700",
                        )}
                      >
                        {currency.symbol.charAt(0)}
                      </div>
                      <div>
                        <div
                          className={cn(
                            "font-bold transition-colors",
                            selectedCurrency === currency.symbol
                              ? "text-teal-primary"
                              : "text-zinc-200",
                          )}
                        >
                          {currency.symbol}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {currency.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-zinc-200">
                        {currency.balance.toFixed(4)} {currency.symbol}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Available balance
                      </div>
                    </div>
                  </div>
                  {selectedCurrency === currency.symbol && (
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-transparent pointer-events-none" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Transaction Details */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800 space-y-6">
              {/* Recipient */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider ml-1">
                  Recipient Address
                </label>
                <div className="relative group">
                  <Input
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="0x..."
                    className="bg-black/20 border-zinc-700 text-white pl-4 pr-10 py-6 text-sm font-mono focus:border-teal-primary/50 focus:ring-teal-primary/20 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Wallet className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Amount
                  </label>
                  {selectedCurrencyData && (
                    <span className="text-xs text-zinc-400">
                      Available:{" "}
                      <span className="text-teal-primary font-mono">
                        {selectedCurrencyData.balance.toFixed(6)}
                      </span>
                    </span>
                  )}
                </div>

                <div className="relative group">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="any"
                    min="0"
                    className="bg-black/20 border-zinc-700 text-white pl-4 pr-24 py-6 text-lg font-mono focus:border-teal-primary/50 focus:ring-teal-primary/20 transition-all"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-500">
                      {selectedCurrencyData?.symbol}
                    </span>
                    <button
                      onClick={() =>
                        selectedCurrencyData &&
                        setAmount(selectedCurrencyData.balance.toString())
                      }
                      className="text-xs bg-teal-500/10 text-teal-primary hover:bg-teal-500/20 px-2 py-1 rounded transition-colors font-medium border border-teal-500/20"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction Summary / Info */}
              <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/10 flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-200/80 leading-relaxed">
                  Make sure the address is correct. Transactions on the
                  blockchain are irreversible.
                  {selectedCurrencyData?.symbol === "SepoliaETH" &&
                    " You are sending testnet assets."}
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <Alert className="border-red-500/20 bg-red-500/5 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-emerald-500/20 bg-emerald-500/5 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <AlertDescription className="text-emerald-400">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Button */}
              <Button
                onClick={handleSend}
                disabled={
                  loading ||
                  !recipientAddress ||
                  !amount ||
                  !selectedCurrencyData
                }
                className={cn(
                  "w-full h-12 text-base font-bold tracking-wide shadow-lg transition-all duration-300",
                  loading
                    ? "bg-zinc-800 text-zinc-400"
                    : "bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white shadow-teal-500/20 hover:shadow-teal-500/30 hover:scale-[1.01]",
                )}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/50"></div>
                    <span>Processing Transaction...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Confirm Transfer</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
