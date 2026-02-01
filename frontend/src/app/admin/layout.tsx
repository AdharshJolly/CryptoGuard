"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import {
  LogOut,
  ShieldAlert,
  FolderSearch,
  BarChart3,
  Settings,
  Network,
  Layers,
  GitMerge,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navItems = [
    { label: "Overview", icon: BarChart3, path: "/admin/overview" },
    { label: "Cases", icon: FolderSearch, path: "/admin/cases" },
    { label: "Intelligence", icon: ShieldAlert, path: "/admin/visualization" },
    { label: "GNN Detection", icon: Network, path: "/admin/gnn-detection" },
    { label: "Gather-Scatter", icon: GitMerge, path: "/admin/gather-scatter" },
    { label: "Peeling Chains", icon: Layers, path: "/admin/peeling-chains" },
  ];

  return (
    <div className="flex min-h-screen bg-black text-zinc-100 font-sans selection:bg-teal-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col fixed h-full z-10 shadow-lg">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800 bg-gradient-to-r from-zinc-950 to-zinc-900">
          <span className="font-bold text-lg tracking-wider text-zinc-100">
            <span className="font-script text-xl text-teal-primary">
              Crypto
            </span>
            <span className="text-teal-secondary">Guard</span>
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 text-zinc-400 hover:text-teal-primary hover:bg-zinc-900/50 transition-all duration-200",
                  pathname === item.path &&
                    "bg-zinc-900/80 text-teal-primary border-r-2 border-teal-primary rounded-none font-medium shadow-[inset_10px_0_20px_-10px_rgba(13,148,136,0.3)]",
                )}
              >
                <item.icon
                  size={18}
                  className={cn(
                    pathname === item.path &&
                      "drop-shadow-[0_0_5px_rgba(13,148,136,0.8)]",
                  )}
                />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded bg-teal-primary/20 text-teal-primary flex items-center justify-center font-bold">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-zinc-100">
                Investigator
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-teal-primary hover:border-teal-primary"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto bg-zinc-950">
        {children}
      </main>
    </div>
  );
}
