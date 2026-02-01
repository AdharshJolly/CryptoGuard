"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bitcoin, Coins, DollarSign } from "lucide-react";
import { WalletBalance } from "@/lib/wallet-service";

// Helper function to get currency icons
function getCurrencyIcon(symbol: string): React.ReactNode {
  switch (symbol.toUpperCase()) {
    case "BTC":
    case "WBTC":
      return <Bitcoin className="w-4 h-4" />;
    case "ETH":
      return <Coins className="w-4 h-4" />;
    case "USDT":
    case "USDC":
    case "DAI":
      return <DollarSign className="w-4 h-4" />;
    default:
      return <Coins className="w-4 h-4" />;
  }
}

interface CryptocurrencySelectorProps {
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  currencies: WalletBalance[];
}

export function CryptocurrencySelector({
  selectedCurrency,
  onCurrencyChange,
  currencies,
}: CryptocurrencySelectorProps) {
  if (!currencies || currencies.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-400 mb-2">No currencies found in your wallet</p>
        <p className="text-zinc-500 text-sm">
          Make sure your wallet has some crypto balance
        </p>
      </div>
    );
  }

  const selectedCurrencyData = currencies.find(
    (c) => c.symbol === selectedCurrency,
  );

  return (
    <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
      <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white">
        <SelectValue>
          {selectedCurrencyData && (
            <div className="flex items-center gap-2">
              {getCurrencyIcon(selectedCurrencyData.symbol)}
              <span className="font-medium">{selectedCurrencyData.symbol}</span>
              <Badge variant="outline" className="text-xs">
                {selectedCurrencyData.balance.toFixed(4)}{" "}
                {selectedCurrencyData.symbol}
              </Badge>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-800">
        {currencies.map((currency) => (
          <SelectItem
            key={currency.symbol}
            value={currency.symbol}
            className="text-white hover:bg-zinc-800 focus:bg-zinc-800"
          >
            <div className="flex items-center gap-2 w-full">
              {getCurrencyIcon(currency.symbol)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{currency.symbol}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      currency.riskLevel === "low"
                        ? "text-green-600"
                        : currency.riskLevel === "medium"
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {currency.riskLevel}
                  </Badge>
                </div>
                <div className="text-xs text-zinc-500">
                  {currency.balance.toFixed(4)} {currency.symbol} available
                </div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
