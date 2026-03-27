"use client";

export default function VaultStatus() {
  return (
    <div
      className="card"
      style={{
        background: "var(--bg-surface-container)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle glow accent */}
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "var(--primary-glow)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-3)",
          marginBottom: "var(--spacing-4)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--tertiary-container)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: "var(--tertiary)" }}
          >
            verified_user
          </span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-headline)",
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Wallet Status
        </h3>
      </div>

      {/* Description */}
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.8125rem",
          color: "var(--text-muted)",
          lineHeight: 1.6,
          margin: 0,
          marginBottom: "var(--spacing-4)",
        }}
      >
        Your wallet is ready for transactions. Always verify addresses before sending funds and never share your private keys.
      </p>

      {/* Status chips */}
      <div style={{ display: "flex", gap: "var(--spacing-3)", flexWrap: "wrap" }}>
        <div className="chip">
          <span className="status-dot status-dot--success" />
          <span style={{ fontWeight: 500 }}>Connected</span>
        </div>
        <div className="chip">
          <span className="status-dot status-dot--success" />
          <span style={{ fontWeight: 500 }}>Ready to Send</span>
        </div>
      </div>
    </div>
  );
}
