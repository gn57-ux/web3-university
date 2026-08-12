"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { mockCurrentUser } from "@/lib/mock/fixtures";

export type MockNetwork = "sepolia" | "mainnet" | "unsupported";

interface MockWalletState {
  connected: boolean;
  address: string;
  ydBalance: number;
  network: MockNetwork;
  connect: () => void;
  disconnect: () => void;
  setNetwork: (network: MockNetwork) => void;
  setYdBalance: (amount: number) => void;
}

const MockWalletContext = createContext<MockWalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address] = useState(mockCurrentUser.address);
  const [ydBalance, setYdBalance] = useState(mockCurrentUser.ydBalance);
  const [network, setNetwork] = useState<MockNetwork>("sepolia");

  const connect = useCallback(() => setConnected(true), []);
  const disconnect = useCallback(() => setConnected(false), []);

  const value = useMemo<MockWalletState>(
    () => ({
      connected,
      address,
      ydBalance,
      network,
      connect,
      disconnect,
      setNetwork,
      setYdBalance,
    }),
    [connected, address, ydBalance, network, connect, disconnect]
  );

  return <MockWalletContext.Provider value={value}>{children}</MockWalletContext.Provider>;
}

export function useMockWallet(): MockWalletState {
  const ctx = useContext(MockWalletContext);
  if (!ctx) {
    throw new Error("useMockWallet must be used within a WalletProvider");
  }
  return ctx;
}
