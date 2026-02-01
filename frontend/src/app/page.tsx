"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { ShieldCheck, Lock, Search } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useEffect, useState } from "react";

// --- Components ---

const TerminalLine = ({
  text,
  delay = 0,
}: {
  text: string;
  delay?: number;
}) => {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      let currentText = "";
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          currentText += text[currentIndex];
          setDisplayed(currentText);
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 30); // Typing speed
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <div className="font-mono text-xs md:text-sm text-green-400 mb-1">
      $ {displayed}
    </div>
  );
};

export default function LandingPage() {
  const { connectWallet, user, isLoading } = useAuth();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (user && user.role === "user") {
      router.push("/user/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleConnect = async () => {
    await connectWallet();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 selection:bg-teal-500/30 font-sans overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-teal-900/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      {/* Nav */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-black/80 backdrop-blur-xl border-b border-zinc-800" : "bg-transparent"}`}
      >
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-teal-500/10 rounded-xl border border-teal-500/20 flex items-center justify-center backdrop-blur-sm">
                <ShieldCheck className="h-6 w-6 text-teal-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full animate-pulse border-2 border-black" />
            </div>
            <span className="font-bold tracking-tight text-xl text-zinc-100">
              <span className="font-script text-2xl text-teal-400 mr-1">
                Crypto
              </span>
              Guard
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/auth/admin">
              <Button
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Admin
              </Button>
            </Link>
            <Button
              onClick={handleConnect}
              className="bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/20"
              disabled={isLoading}
            >
              <Lock className="w-4 h-4 mr-2" />
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 min-h-screen flex flex-col justify-center">
        <div className="container mx-auto relative z-10 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-teal-400 text-sm font-mono mb-8 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                SYSTEM OPERATIONAL
              </div>

              <h1 className="text-6xl lg:text-8xl font-bold tracking-tighter mb-8 leading-[1]">
                Deanonymize <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-teal-200 to-white">
                  The Dark Web.
                </span>
              </h1>

              <p className="text-xl text-zinc-400 max-w-xl mb-10 leading-relaxed">
                A specialized forensic toolset for blockchain investigations.
                Map transaction flows, identify risk clusters, and analyze
                wallet behavior with high-precision heuristic models.
              </p>

              <div className="flex flex-col sm:flex-row gap-5">
                <Button
                  onClick={handleConnect}
                  size="lg"
                  className="bg-teal-500 hover:bg-teal-400 text-black font-bold text-lg px-10 h-16 rounded-full shadow-[0_0_40px_-10px_rgba(20,184,166,0.6)] hover:shadow-[0_0_60px_-10px_rgba(20,184,166,0.8)] transition-all duration-300"
                  disabled={isLoading}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {isLoading ? "Connecting..." : "Connect Wallet"}
                </Button>
                <Link href="/auth/admin">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-zinc-800 bg-black/40 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-full text-lg px-10 h-16 backdrop-blur-sm"
                  >
                    Admin Console
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Interactive Terminal / Graphic */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              {/* Decorative Ring */}
              <div className="absolute inset-0 border border-teal-500/20 rounded-2xl rotate-3 scale-105" />

              <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-sm leading-relaxed">
                {/* Window Controls */}
                <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  <div className="ml-auto text-xs text-zinc-500">
                    admin@cryptoguard:~
                  </div>
                </div>

                {/* Terminal Content */}
                <div className="p-6 h-[400px] overflow-hidden relative">
                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[2] bg-[length:100%_2px,3px_100%] pointer-events-none" />

                  <TerminalLine
                    text="Initializing CryptoGuard Core v2.4.0..."
                    delay={500}
                  />
                  <TerminalLine
                    text="Loading heuristic models (CatBoost, XGBoost)... DONE"
                    delay={1500}
                  />
                  <TerminalLine
                    text="Connecting to Ethereum Mainnet Node... CONNECTED"
                    delay={2500}
                  />
                  <TerminalLine
                    text="Scanning mempool for high-risk signatures..."
                    delay={3500}
                  />

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 5.5 }}
                    className="mt-4 border-t border-dashed border-zinc-800 pt-2"
                  >
                    <div className="flex justify-between text-zinc-400 mb-2">
                      <span>Target: 0x7a2...9f1</span>
                      <span className="text-red-400 font-bold">
                        RISK: CRITICAL
                      </span>
                    </div>
                    <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "92%" }}
                        transition={{ duration: 1, delay: 6 }}
                        className="h-full bg-red-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="bg-zinc-900 p-2 rounded border border-zinc-800">
                        <div className="text-xs text-zinc-500">Layering</div>
                        <div className="text-teal-400">DETECTED</div>
                      </div>
                      <div className="bg-zinc-900 p-2 rounded border border-zinc-800">
                        <div className="text-xs text-zinc-500">Structuring</div>
                        <div className="text-teal-400">DETECTED</div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
