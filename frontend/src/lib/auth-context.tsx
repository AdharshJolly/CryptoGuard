import React, { createContext, useContext, useState, useEffect } from "react";
import { User, authApi } from "@/lib/api/auth";
import { toast } from "sonner";
import { ethers } from "ethers";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginAdmin: (e: string, p: string) => Promise<void>;
  connectWallet: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await authApi.getSession();
      setUser(session);
    } catch (error) {
      console.error("Session check failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const admin = await authApi.loginAdmin(email, pass);
      setUser(admin);
      toast.success("Welcome back, Investigator.");
    } catch (error) {
      toast.error("Invalid credentials");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const connectWallet = async () => {
    setIsLoading(true);
    try {
      if (!window.ethereum) {
        toast.error("MetaMask not detected");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // 1. Get Nonce
      const nonce = await authApi.getNonce(address);

      // 2. Sign Nonce
      const signature = await signer.signMessage(nonce);

      // 3. Verify & Login
      const user = await authApi.verifySignature(address, signature);
      setUser(user);
      toast.success("Secure connection established.");
    } catch (error) {
      console.error("Wallet connection failed", error);
      toast.error("Connection failed or rejected.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await authApi.logout();
    setUser(null);
    setIsLoading(false);
    toast.info("Session terminated.");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginAdmin, connectWallet, logout }}>
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
