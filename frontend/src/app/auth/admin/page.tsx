"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@cryptoguard.io");
  const [password, setPassword] = useState("admin123");
  const { loginAdmin, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role === "admin") {
      router.push("/admin/overview");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginAdmin(email, password);
      router.push("/admin/overview");
    } catch (err) {
      // Error handled in context
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Investigator Access
          </CardTitle>
          <CardDescription className="text-center text-zinc-500">
            Secure clearance required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Identity (Email)
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Key (Password)
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-white"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-zinc-200 mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Authenticate"
              )}
            </Button>

            <div className="mt-4 p-3 bg-zinc-950 rounded border border-zinc-800 text-xs text-zinc-500">
              <p>Demo Credentials:</p>
              <p>User: admin@cryptoguard.io</p>
              <p>Pass: admin123</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
