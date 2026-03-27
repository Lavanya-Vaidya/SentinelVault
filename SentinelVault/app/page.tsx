"use client";

import { useState, useRef } from "react";
import { getTransactions, getBalance } from "../lib/api";
import DashboardLayout from "./components/DashboardLayout";
import WalletInput from "./components/WalletInput";
import WalletInfo from "./components/WalletInfo";
import CreateTransaction from "./components/CreateTransaction";
import ScanAndBroadcast from "./components/ScanAndBroadcast";
import TransactionList from "./components/TransactionList";
import PortfolioHealth from "./components/PortfolioHealth";
import VaultStatus from "./components/VaultStatus";
import RiskAnalysis from "./components/RiskAnalysis";

export default function Home() {
  const [chain, setChain] = useState("ethereum");
  const [address, setAddress] = useState("");
  const [txs, setTxs] = useState<any>({});
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showWalletInput, setShowWalletInput] = useState(false);
  const walletInputRef = useRef<HTMLDivElement>(null);

  const handleLoad = async (selectedChain: string, addr: string) => {
    setChain(selectedChain);
    setAddress(addr);
    setLoading(true);

    const [txData, bal] = await Promise.all([
      getTransactions(selectedChain, addr),
      getBalance(selectedChain, addr),
    ]);

    setTxs(txData);
    setBalance(bal);
    setLoading(false);
    setShowWalletInput(false);
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
          @media (max-width: 1024px) {
            .responsive-grid {
              grid-template-columns: 1fr !important;
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
          {/* Risk Analysis */}
          <RiskAnalysis 
            address={address} 
            transactions={txs.normal || []} 
            chain={chain} 
          />

          {/* Portfolio Health */}
          <PortfolioHealth />

          {/* Recent Activity */}
          <TransactionList txs={txs} chain={chain} address={address} />

          {/* Vault Status */}
          <VaultStatus />
        </div>
      </div>
    </DashboardLayout>
  );
}