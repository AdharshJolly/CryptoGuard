"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "sonner";
import { ethers } from "ethers";

// Extend Window interface for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (
        event: string,
        handler: (...args: unknown[]) => void,
      ) => void;
      isMetaMask?: boolean;
    };
  }
}

export interface User {
  id: string;
  role: "user" | "admin";
  address?: string;
  email?: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginAdmin: (email: string, password: string) => Promise<void>;
  connectWallet: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("crypto_guard_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem("crypto_guard_user");
      }
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem("crypto_guard_user", JSON.stringify(data.user));
      } else {
        // If session check fails (e.g. 401), clear local storage if it was strictly server-session based
        // But for better UX on client-side routing, we might keep it or verify validity.
        // For now, if server says no session, we clear user.
        // setUser(null);
        // localStorage.removeItem("crypto_guard_user");
      }
    } catch (error) {
      console.error("Session check failed", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const loginAdmin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem("crypto_guard_user", JSON.stringify(data.user));
      toast.success("Welcome back, Investigator.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Invalid credentials",
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const connectWallet = async () => {
    setIsLoading(true);
    try {
      if (!window.ethereum) {
        toast.error(
          "MetaMask not detected. Please install MetaMask extension.",
        );
        return;
      }

      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // 1. Get Nonce from server
      const nonceResponse = await fetch("/api/auth/wallet/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (!nonceResponse.ok) {
        throw new Error("Failed to get nonce");
      }

      const { nonce } = await nonceResponse.json();
      console.log("Got nonce from server, length:", nonce.length);

      // 2. Sign the nonce with MetaMask
      const signature = await signer.signMessage(nonce);
      console.log("Signed message, signature length:", signature.length);

      // 3. Verify signature on server
      const verifyResponse = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || "Verification failed");
      }

      const data = await verifyResponse.json();
      setUser(data.user);
      localStorage.setItem("crypto_guard_user", JSON.stringify(data.user));
      toast.success("Secure connection established.");
      // Reload session to ensure user state is updated
      await checkSession();
    } catch (error) {
      console.error("Wallet connection failed", error);
      if (error instanceof Error && error.message.includes("user rejected")) {
        toast.error("Connection rejected by user.");
      } else {
        toast.error("Connection failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      localStorage.removeItem("crypto_guard_user");
      toast.info("Session terminated.");
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, loginAdmin, connectWallet, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
