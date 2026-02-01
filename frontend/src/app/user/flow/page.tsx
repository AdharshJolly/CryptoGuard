"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
      <div className="w-full h-[600px] bg-zinc-950 animate-pulse rounded-lg" />
    ),
  },
);

export default function UserFlowPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Transaction Flow
        </h1>
        <p className="text-zinc-500 mt-1">
          Visualize your wallet connections and transaction paths
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Network Visualization</CardTitle>
          <CardDescription>
            Interactive graph of your transaction network
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden rounded-b-lg">
          <TransactionGraph height={600} />
        </CardContent>
      </Card>
    </div>
  );
}
