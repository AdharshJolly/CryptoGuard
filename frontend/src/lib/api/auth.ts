import { ethers } from "ethers";

// Types
export interface User {
  id: string;
  role: "user" | "admin";
  address?: string; // For users
  email?: string; // For admins
  name?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Mock Database State
let MOCK_SESSION: User | null = null;

// Mock API Delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const authApi = {
  // --- Admin Auth ---
  loginAdmin: async (email: string, password: string): Promise<User> => {
    await delay(800);
    if (email === "admin@cryptoguard.io" && password === "admin123") {
      const user: User = {
        id: "admin-01",
        role: "admin",
        email,
        name: "Lead Investigator",
      };
      MOCK_SESSION = user;
      return user;
    }
    throw new Error("Invalid credentials");
  },

  // --- User Auth (MetaMask Flow) ---
  getNonce: async (address: string): Promise<string> => {
    await delay(300);
    return `Sign this message to verify your identity: ${Math.random().toString(36).substring(7)}`;
  },

  verifySignature: async (address: string, signature: string): Promise<User> => {
    await delay(600);
    // In a real app, verify signature with ethers.verifyMessage
    // Here we assume client verified it or just accept for demo
    const user: User = {
      id: `user-${address.substring(0, 6)}`,
      role: "user",
      address,
      name: "Anonymous Analyst",
    };
    MOCK_SESSION = user;
    return user;
  },

  // --- Session Management ---
  getSession: async (): Promise<User | null> => {
    await delay(400);
    return MOCK_SESSION;
  },

  logout: async (): Promise<void> => {
    await delay(300);
    MOCK_SESSION = null;
  },
};
