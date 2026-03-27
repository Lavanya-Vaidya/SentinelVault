"use client";

import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { chains } from "../../lib/chains";
import { encodeQR } from "../../lib/qr";
import { estimateFees, FeeEstimate } from "../../lib/feeEstimate";
import { validateTxInput } from "../../lib/validators";
import type { FeeSpeed } from "../../lib/env";

interface Props {
  chain: string;
  sender?: string;
}

const SPEED_OPTIONS: FeeSpeed[] = ["slow", "normal", "fast"];
const SPEED_LABELS: Record<FeeSpeed, string> = {
  slow: "Slow",
  normal: "Normal",
  fast: "Fast",
};

export default function CreateTransaction({ chain: parentChain, sender }: Props) {
  const [chain, setChain] = useState(parentChain || "ethereum");
  const [from, setFrom] = useState(sender || "");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speed, setSpeed] = useState<FeeSpeed>("normal");
  const [feeEstimate, setFeeEstimate] = useState<FeeEstimate | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);

  const [riskAnalysis, setRiskAnalysis] = useState<any>(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [showRiskWarning, setShowRiskWarning] = useState(false);

  // Update from address when sender prop changes
  useEffect(() => {
    if (sender) {
      setFrom(sender);
    }
  }, [sender]);

  const amountPlaceholder =
    chain === "bitcoin"
      ? "Amount (BTC)"
      : chain === "solana"
      ? "Amount (SOL)"
      : "Amount (ETH)";

  // Convert amount to ETH for risk analysis (use current amount regardless of chain)
  const getAmountInEth = (): number => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return 0;
    
    // For simplicity, use the amount directly as ETH equivalent
    // In production, you'd want real conversion rates
    return amountNum;
  };

  const analyzeTransactionRisk = async () => {
    if (!from || !to || !amount) return null;
    
    setRiskLoading(true);
    try {
      const response = await fetch('/api/risk/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: from,
          recipient: to,
          amount_eth: getAmountInEth(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRiskAnalysis(data);
        
        // Show warning if high risk
        if (data.combined_risk?.risk_level === 'high') {
          setShowRiskWarning(true);
        } else {
          setShowRiskWarning(false);
        }
        
        return data;
      }
    } catch (error) {
      console.error('Risk analysis failed:', error);
      setRiskAnalysis(null);
      setShowRiskWarning(false);
    } finally {
      setRiskLoading(false);
    }
    
    return null;
  };

  // Load fee estimate when chain changes
  useEffect(() => {
    let isMounted = true;

    const loadFees = async () => {
      setFeeLoading(true);
      try {
        const estimate = await estimateFees(chain);
        if (isMounted) {
          setFeeEstimate(estimate);
        }
      } catch (e) {
        console.error("Failed to load fees:", e);
        if (isMounted) {
          setFeeEstimate(null);
        }
      } finally {
        if (isMounted) {
          setFeeLoading(false);
        }
      }
    };

    setQr("");
    setError("");
    loadFees();

    return () => {
      isMounted = false;
    };
  }, [chain]);

  // Auto-analyze risk when user fills in transaction details
  useEffect(() => {
    if (from && to && amount && parseFloat(amount) > 0) {
      // Debounce risk analysis to avoid too many API calls
      const timeoutId = setTimeout(() => {
        analyzeTransactionRisk();
      }, 1000); // Wait 1 second after user stops typing

      return () => clearTimeout(timeoutId);
    } else {
      // Clear risk analysis if inputs are incomplete
      setRiskAnalysis(null);
      setShowRiskWarning(false);
    }
  }, [from, to, amount]);

  const handleGenerate = async () => {
    // Validate input
    const validation = validateTxInput(from, to, amount, chain);
    if (!validation.valid) {
      setError(validation.errors.join(". "));
      setQr("");
      return;
    }

    setError("");
    setQr("");
    setLoading(true);

    try {
      // Step 1: Analyze transaction risk
      console.log('Analyzing transaction risk...');
      const riskData = await analyzeTransactionRisk();
      
      // Step 2: Check if transaction is too risky
      if (riskData && riskData.combined_risk?.risk_level === 'high' && riskData.combined_risk?.risk_score > 90) {
        setError(`⚠️ High Risk Transaction Detected! Risk Score: ${riskData.combined_risk.risk_score.toFixed(1)}. Consider using a different recipient address.`);
        setLoading(false);
        return;
      }

      // Step 3: Build transaction if risk is acceptable
      console.log('Building transaction...');
      const payload = await (chains as any)[chain].buildTx({
        from,
        to,
        amount,
        speed,
      });
      
      // Step 4: Generate QR code with risk info embedded
      const qrData = {
        chain,
        payload,
        riskAnalysis: riskData ? {
          riskScore: riskData.combined_risk.risk_score,
          riskLevel: riskData.combined_risk.risk_level,
          recommendation: riskData.combined_risk.recommendation,
          timestamp: new Date().toISOString()
        } : null
      };
      
      setQr(encodeQR(qrData));
      
      // Log successful transaction with risk analysis
      if (riskData) {
        console.log(`Transaction QR generated with risk analysis:`, {
          riskScore: riskData.combined_risk.risk_score,
          riskLevel: riskData.combined_risk.risk_level,
          recommendation: riskData.combined_risk.recommendation
        });
      }
      
    } catch (e: any) {
      setError(e.message || "Failed to build transaction");
    } finally {
      setLoading(false);
    }
  };

  const getFeeDisplay = (): string => {
    if (!feeEstimate) return "Loading...";
    const feeValue = feeEstimate[speed];
    return `${feeValue} ${feeEstimate.unit}`;
  };

  return (
    <div
      className="card"
      style={{
        background: "var(--bg-surface-container)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-4)",
      }}
    >
      {/* Divider accent line */}
      <div
        style={{
          width: "100%",
          height: 2,
          background: "linear-gradient(90deg, var(--primary) 0%, transparent 100%)",
          borderRadius: 1,
          marginBottom: "var(--spacing-2)",
        }}
      />

      <h2
        style={{
          fontFamily: "var(--font-headline)",
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        🛡️ Secure Transfer Initiation
      </h2>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          margin: "var(--spacing-2) 0 0 0",
        }}
      >
        AI-powered risk analysis is automatically performed for all transfers
      </p>

      {/* Chain selector */}
      <select
        id="tx-chain"
        name="chain"
        value={chain}
        onChange={(e) => {
          setChain(e.target.value);
        }}
        style={{
          width: "100%",
          background: "var(--bg-surface-lowest)",
          border: "1px solid var(--ghost-border)",
          borderRadius: "var(--radius-lg)",
          padding: "0.625rem 1rem",
          color: "var(--text-primary)",
          fontFamily: "var(--font-label)",
          fontSize: "0.8125rem",
          cursor: "pointer",
        }}
      >
        {Object.entries(chains).map(([key, val]) => (
          <option key={key} value={key}>
            {val.label}
          </option>
        ))}
      </select>

      {/* Recipient */}
      <div>
        <label
          htmlFor="tx-recipient-address"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "0.6875rem",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            display: "block",
            marginBottom: "var(--spacing-2)",
          }}
        >
          Recipient Address
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="tx-recipient-address"
            name="recipient-address"
            placeholder="Enter address..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-surface-lowest)",
              border: "1px solid var(--ghost-border)",
              borderRadius: "var(--radius-lg)",
              padding: "0.625rem 1rem",
              paddingRight: "2.5rem",
              color: "var(--text-primary)",
              fontFamily: "var(--font-label)",
              fontSize: "0.8125rem",
            }}
          />
          {to && (
            <button
              onClick={() => setTo("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16, color: "var(--text-muted)" }}
              >
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* From address */}
      <div>
        <label
          htmlFor="tx-from-address"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "0.6875rem",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            display: "block",
            marginBottom: "var(--spacing-2)",
          }}
        >
          From Address {sender && "(Connected Wallet)"}
        </label>
        <input
          id="tx-from-address"
          name="from-address"
          placeholder={sender ? "Connected wallet address" : "Enter your address..."}
          value={from}
          onChange={(e) => !sender && setFrom(e.target.value)}
          readOnly={!!sender}
          style={{
            width: "100%",
            background: sender ? "var(--bg-surface-low)" : "var(--bg-surface-lowest)",
            border: "1px solid var(--ghost-border)",
            borderRadius: "var(--radius-lg)",
            padding: "0.625rem 1rem",
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            color: "var(--text-primary)",
            opacity: sender ? 0.7 : 1,
            cursor: sender ? "not-allowed" : "text",
          }}
        />
        {sender && (
          <p
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "0.625rem",
              color: "var(--text-muted)",
              margin: "var(--spacing-1) 0 0",
            }}
          >
            🔒 Using your connected wallet address for enhanced security
          </p>
        )}
      </div>

      {/* Amount + Speed */}
      <div style={{ display: "flex", gap: "var(--spacing-3)", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 160px" }}>
          <label
            htmlFor="tx-amount"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "block",
              marginBottom: "var(--spacing-2)",
            }}
          >
            {amountPlaceholder}
          </label>
          <input
            id="tx-amount"
            name="amount"
            placeholder="0.00"
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-surface-lowest)",
              border: "1px solid var(--ghost-border)",
              borderRadius: "var(--radius-lg)",
              padding: "0.625rem 1rem",
              color: "var(--text-primary)",
              fontFamily: "var(--font-label)",
              fontSize: "0.8125rem",
            }}
          />
        </div>

        <div>
          <label
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "block",
              marginBottom: "var(--spacing-2)",
            }}
          >
            Speed
          </label>
          <div style={{ display: "flex", gap: 2 }}>
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                disabled={feeLoading}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  cursor: feeLoading ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-label)",
                  fontSize: "0.75rem",
                  fontWeight: speed === s ? 600 : 400,
                  background:
                    speed === s
                      ? "var(--primary)"
                      : "var(--bg-surface-highest)",
                  color:
                    speed === s
                      ? "var(--bg-base)"
                      : "var(--text-muted)",
                  transition: "all 0.15s ease",
                  opacity: feeLoading ? 0.5 : 1,
                }}
              >
                {SPEED_LABELS[s]}
              </button>
            ))}
          </div>
          {feeEstimate && (
            <p
              style={{
                fontFamily: "var(--font-label)",
                fontSize: "0.625rem",
                color: "var(--text-muted)",
                margin: "var(--spacing-1) 0 0",
              }}
            >
              Fee: {feeEstimate[speed]} {feeEstimate.unit}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(255, 56, 56, 0.1)",
            color: "var(--error)",
            padding: "var(--spacing-3)",
            borderRadius: "var(--radius-lg)",
            fontFamily: "var(--font-body)",
            fontSize: "0.8125rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Risk Analysis Display */}
      {riskAnalysis && (
        <div
          style={{
            background: riskAnalysis.combined_risk?.risk_level === 'high' 
              ? "rgba(255, 56, 56, 0.1)" 
              : riskAnalysis.combined_risk?.risk_level === 'medium'
              ? "rgba(255, 193, 7, 0.1)"
              : "rgba(76, 175, 80, 0.1)",
            color: riskAnalysis.combined_risk?.risk_level === 'high'
              ? "var(--error)"
              : riskAnalysis.combined_risk?.risk_level === 'medium'
              ? "var(--warning)"
              : "var(--success)",
            padding: "var(--spacing-3)",
            borderRadius: "var(--radius-lg)",
            fontFamily: "var(--font-body)",
            fontSize: "0.8125rem",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "var(--spacing-2)" }}>
            🛡️ Risk Analysis
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-1)" }}>
            <span>Risk Score:</span>
            <span style={{ fontWeight: 600 }}>
              {riskAnalysis.combined_risk?.risk_score?.toFixed(1) || '0.0'}/100
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-1)" }}>
            <span>Risk Level:</span>
            <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
              {riskAnalysis.combined_risk?.risk_level || 'unknown'}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Recommendation:</span>
            <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
              {riskAnalysis.combined_risk?.recommendation || 'unknown'}
            </span>
          </div>
        </div>
      )}

      {/* Risk Loading Indicator */}
      {riskLoading && (
        <div
          style={{
            background: "rgba(33, 150, 243, 0.1)",
            color: "var(--primary)",
            padding: "var(--spacing-3)",
            borderRadius: "var(--radius-lg)",
            fontFamily: "var(--font-body)",
            fontSize: "0.8125rem",
            textAlign: "center",
          }}
        >
          🔍 Analyzing transaction risk...
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{ display: "flex", gap: "var(--spacing-3)", flexWrap: "wrap" }}
      >
        <button
          onClick={handleGenerate}
          disabled={loading || feeLoading}
          className="btn-primary"
          style={{
            flex: "1 1 auto",
            opacity: loading || feeLoading ? 0.6 : 1,
            cursor: loading || feeLoading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Analyzing & Building..." : riskAnalysis ? `Generate QR (${riskAnalysis.combined_risk?.risk_level || 'unknown'} risk)` : "Generate QR"}
        </button>
      </div>

      {/* QR output */}
      {qr && (
        <div
          className="animate-fade-in"
          style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}
        >
          <div
            style={{
              background: "white",
              padding: "var(--spacing-6)",
              borderRadius: "var(--radius-xl)",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <QRCodeCanvas value={qr} size={200} />
          </div>

          <div
            style={{
              background: "rgba(255, 180, 0, 0.08)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--spacing-3)",
            }}
          >
            <p
              style={{
                color: "#ffb400",
                fontFamily: "var(--font-label)",
                fontSize: "0.75rem",
                fontWeight: 600,
                margin: 0,
              }}
            >
              ⚠️ Unsigned Transaction
            </p>
            <p
              style={{
                color: "rgba(255, 180, 0, 0.6)",
                fontSize: "0.75rem",
                margin: "0.25rem 0 0",
              }}
            >
              Scan this QR on your air-gapped signer. Then use "Broadcast Signed
              Transaction" to submit it.
            </p>
          </div>

          <pre
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "0.6875rem",
              background: "var(--bg-surface-lowest)",
              color: "var(--text-muted)",
              padding: "var(--spacing-3)",
              borderRadius: "var(--radius-lg)",
              overflow: "auto",
              maxHeight: 100,
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {qr}
          </pre>
        </div>
      )}
    </div>
  );
}