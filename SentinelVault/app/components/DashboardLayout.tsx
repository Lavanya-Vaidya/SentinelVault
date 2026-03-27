"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onConnectWallet?: () => void;
}

export default function DashboardLayout({ children, onConnectWallet }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobileMenuOpen]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <style>{`
        .dashboard-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 240px;
          z-index: 100;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .dashboard-main {
          flex: 1;
          margin-left: 240px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          transition: filter 0.3s ease;
        }

        .dashboard-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 90;
          transition: opacity 0.3s ease;
        }

        .mobile-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1.25rem;
          background: var(--bg-surface-lowest);
          border-bottom: 1px solid var(--ghost-border);
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .desktop-header {
          display: flex;
          align-items: center;
          padding: var(--spacing-4) var(--spacing-8);
          min-height: 56px;
        }

        @media (max-width: 768px) {
          .dashboard-sidebar {
            transform: translateX(-100%);
            box-shadow: none;
          }
          .dashboard-sidebar.open {
            transform: translateX(0);
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
          }
          .dashboard-main {
            margin-left: 0 !important;
          }
          .dashboard-main main {
            padding: var(--spacing-4) !important;
          }
          .dashboard-overlay.open {
            display: block;
          }
          .mobile-header {
            display: flex;
          }
          .desktop-header {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Mobile Overlay */}
      <div 
        className={`dashboard-overlay ${isMobileMenuOpen ? "open" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <div className={`dashboard-sidebar ${isMobileMenuOpen ? "open" : ""}`}>
        <Sidebar onConnectWallet={onConnectWallet} />
      </div>

      {/* Main area */}
      <div className="dashboard-main">
        
        {/* Mobile Header (Only visible on mobile) */}
        <header className="mobile-header">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-lg)",
                background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 10px var(--primary-glow)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--bg-surface)" }}>
                shield
              </span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-headline)",
                fontSize: "1.125rem",
                fontWeight: 800,
                color: "var(--primary)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              SentinelVault
            </h1>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.5rem",
              cursor: "pointer",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
              menu
            </span>
          </button>
        </header>

        {/* Desktop Header (Only visible on desktop) */}
        <header className="desktop-header">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)" }}>
            <span
              style={{
                fontFamily: "var(--font-label)",
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
              }}
            >
              Vault Overview
            </span>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            padding: "var(--spacing-6) var(--spacing-8)",
          }}
        >
          {children}
        </main>

        <StatusBar />
      </div>
    </div>
  );
}
