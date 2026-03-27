"use client";

import { useState, useEffect } from "react";

export default function StatusBar() {
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string>("");

  useEffect(() => {
    const fetchBtcPrice = async () => {
      try {
        const response = await fetch("/api/rates");
        if (!response.ok) {
          throw new Error(`Failed to fetch rates: ${response.status}`);
        }
        const data = await response.json();
        console.log("StatusBar - Fetched rates:", data);
        setBtcPrice(data.bitcoin);
        setPriceError("");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error("StatusBar - Failed to fetch BTC price:", msg);
        setPriceError(msg);
      }
    };

    // Fetch immediately
    fetchBtcPrice();

    // Set up polling every 10 seconds
    const interval = setInterval(fetchBtcPrice, 10000);

    return () => clearInterval(interval);
  }, []);

  const formattedPrice = btcPrice
    ? `$${btcPrice.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "$--,---.--";

  return (
    <footer
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--spacing-2) var(--spacing-8)",
        background: "var(--bg-surface-lowest)",
        fontSize: "0.6875rem",
        fontFamily: "var(--font-label)",
        color: "var(--text-muted)",
        borderTop: "1px solid var(--ghost-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)" }}>
        <span>
          Network Status:{" "}
          <span style={{ color: "var(--tertiary)", fontWeight: 600 }}>Optimal (14 Blocks/h)</span>
        </span>
        <span>
          BTC Price:{" "}
          <span
            style={{
              fontWeight: 600,
              color: priceError ? "var(--error)" : "var(--text-primary)",
              opacity: btcPrice ? 1 : 0.5,
            }}
          >
            {formattedPrice}
          </span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
        <span>Sync Progress:</span>
        <span className="status-dot status-dot--success" />
      </div>
    </footer>
  );
}
