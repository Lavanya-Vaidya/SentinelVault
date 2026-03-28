"use client";

import { useState, useRef } from "react";
import { useCallback } from "react";
import { getTransactions, getBalance } from "../lib/api";
import DashboardLayout from "./components/DashboardLayout";
import WalletInput from "./components/WalletInput";
import WalletInfo from "./components/WalletInfo";
import CreateTransaction from "./components/CreateTransaction";
import ScanAndBroadcast from "./components/ScanAndBroadcast";
import TransactionList from "./components/TransactionList";
import PortfolioHealth from "./components/PortfolioHealth";
import VaultStatus from "./components/VaultStatus";
export default function Home() {
  const [chain, setChain] = useState("ethereum");
  const [address, setAddress] = useState("");
  const [txs, setTxs] = useState<any>({});
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showWalletInput, setShowWalletInput] = useState(false);
  const walletInputRef = useRef<HTMLDivElement>(null);

  const handleLoad = async (selectedChain: string, addr: string) => {
    setChain(selectedChain);
    setAddress(addr);
    setLoading(true);
    setLoadError("");

    try {
      const [txData, bal] = await Promise.all([
        getTransactions(selectedChain, addr),
        getBalance(selectedChain, addr),
      ]);

      setTxs(txData);
      setBalance(bal);
      setShowWalletInput(false);
    } catch (err: any) {
      console.error("Failed to load wallet data:", err);
      setLoadError(err.message || "Failed to load wallet data. Please check the address and try again.");
      setAddress("");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = () => {
    setShowWalletInput(true);
    // Scroll to wallet input on next render
    setTimeout(() => {
      walletInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  return (
    <DashboardLayout onConnectWallet={handleConnectWallet}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: "var(--spacing-6)",
          alignItems: "start",
        }}
        className="responsive-grid"
      >
        <style>{`
          @media (max-width: 768px) {
            .responsive-grid {
              grid-template-columns: 1fr !important;
              gap: var(--spacing-4) !important;
            }
          }
        `}</style>
        {/* ── Left Column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-6)" }}>
          {/* Wallet Input (shown when Connect Wallet clicked or no address yet) */}
          {(showWalletInput || !address) && (
            <div ref={walletInputRef} className="animate-fade-in">
              <WalletInput onSubmit={handleLoad} loading={loading} />
            </div>
          )}

          {/* Error banner */}
          {loadError && (
            <div
              style={{
                background: "rgba(255, 56, 56, 0.1)",
                color: "var(--error)",
                padding: "var(--spacing-4)",
                borderRadius: "var(--radius-lg)",
                fontFamily: "var(--font-body)",
                fontSize: "0.8125rem",
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-3)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
              <span>{loadError}</span>
            </div>
          )}

          {/* Balance Card */}
          <WalletInfo
            address={address}
            balance={balance}
            txCount={txs?.normal?.length ?? 0}
            chain={chain}
          />

          {/* Initiate Transfer */}
          <CreateTransaction chain={chain} sender={address} />

          {/* Broadcast Signed TX */}
          <ScanAndBroadcast />
        </div>

        {/* ── Right Column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-6)" }}>
          {/* Portfolio Health */}
          <PortfolioHealth />

          {/* Recent Activity */}
          <TransactionList txs={txs} chain={chain} address={address} />

          {/* Vault Status */}
          <VaultStatus address={address} />
        </div>
      </div>
    </DashboardLayout>
  );
}