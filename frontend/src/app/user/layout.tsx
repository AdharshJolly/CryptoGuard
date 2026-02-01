"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { LogOut, LayoutDashboard, Activity } from "lucide-react";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/user/dashboard"
            className="font-bold text-lg tracking-tight"
          >
            CryptoGuard
          </Link>
          <nav className="flex gap-4">
            <Link
              href="/user/dashboard"
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-2"
            >
              <LayoutDashboard size={16} /> Dashboard
            </Link>
            <Link
              href="/user/transactions"
              className="text-sm text-zinc-400 hover:text-white flex items-center gap-2"
            >
              <Activity size={16} /> Activity
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-zinc-500 font-mono hidden md:block">
            {user?.address}
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={16} />
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
