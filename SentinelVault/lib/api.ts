import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "./env";
import { isValidAddress } from "./validators";

const ETHERSCAN_API_KEY = config.ethereum.etherscanKey;

// ─── Transactions ─────────────────────────────────────────────────────────

export async function getTransactions(chain: string, address: string) {
  // Validate address format
  const addrCheck = isValidAddress(address, chain);
  if (!addrCheck.valid) {
    throw new Error(addrCheck.error);
  }

  try {
    if (chain === "ethereum") {
      let baseUrl = "https://api.etherscan.io/api";
      const params = new URLSearchParams({
        module: "account",
        address,
        startblock: "0",
        endblock: "latest",
        sort: "desc",
        page: "1",
        offset: config.limits.txLimit.toString(),
      });

      if (ETHERSCAN_API_KEY) {
        params.append("apikey", ETHERSCAN_API_KEY);
      } else {
        baseUrl = "https://eth.blockscout.com/api";
      }

      const [normalRes, internalRes, tokenRes] = await Promise.all([
        fetch(`${baseUrl}?action=txlist&${params}`),
        fetch(`${baseUrl}?action=txlistinternal&${params}`),
        fetch(`${baseUrl}?action=tokentx&${params}`),
      ]);

      const [n, i, t] = await Promise.all([
        normalRes.json(),
        internalRes.json(),
        tokenRes.json(),
      ]);

      if (n.status !== "1" && n.result !== "") {
        console.warn("Etherscan returned no normal transactions");
      }

      return {
        normal: (Array.isArray(n.result) ? n.result : []) || [],
        internal: (Array.isArray(i.result) ? i.result : []) || [],
        tokens: (Array.isArray(t.result) ? t.result : []) || [],
      };
    }

    if (chain === "bitcoin") {
      const res = await fetch(
        `/api/bitcoin?action=transactions&address=${address}&limit=${config.limits.txLimit}`
      );
      if (!res.ok) throw new Error("Failed to fetch Bitcoin transactions");

      const data = await res.json();
      return { normal: data.txs || [] };
    }

    if (chain === "solana") {
      const connection = new Connection(config.solana.rpc, config.solana.commitment);
      const pubkey = new PublicKey(address);
      const sigs = await connection.getSignaturesForAddress(pubkey, {
        limit: config.limits.txLimit,
      });
      return { normal: sigs };
    }

    return { normal: [] };
  } catch (error) {
    console.error(`Failed to fetch ${chain} transactions:`, error);
    throw error;
  }
}

// ─── Balance ──────────────────────────────────────────────────────────────

export async function getBalance(chain: string, address: string): Promise<number> {
  // Validate address format
  const addrCheck = isValidAddress(address, chain);
  if (!addrCheck.valid) {
    throw new Error(addrCheck.error);
  }

  try {
    if (chain === "ethereum") {
      let baseUrl = "https://api.etherscan.io/api";
      const params = new URLSearchParams({
        module: "account",
        action: "balance",
        address,
        tag: "latest",
      });

      if (ETHERSCAN_API_KEY) {
        params.append("apikey", ETHERSCAN_API_KEY);
      } else {
        baseUrl = "https://eth.blockscout.com/api";
      }

      const res = await fetch(`${baseUrl}?${params}`);
      const data = await res.json();

      if (data.status !== "1") {
        throw new Error("Failed to fetch ETH balance");
      }

      return Number(data.result) / 1e18;
    }

    if (chain === "bitcoin") {
      const res = await fetch(
        `/api/bitcoin?action=balance&address=${address}`
      );
      if (!res.ok) throw new Error("Failed to fetch BTC balance");

      const data = await res.json();
      return data.final_balance / 1e8;
    }

    if (chain === "solana") {
      const connection = new Connection(config.solana.rpc, config.solana.commitment);
      const pubkey = new PublicKey(address);
      const lamports = await connection.getBalance(pubkey);
      return lamports / 1e9;
    }

    return 0;
  } catch (error) {
    console.error(`Failed to fetch ${chain} balance:`, error);
    throw error;
  }
}

// ─── Get multiple balances for portfolio ───────────────────────────────────

export async function getMultiChainBalance(addresses: Record<string, string>): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  const promises = Object.entries(addresses).map(async ([chain, address]) => {
    try {
      const balance = await getBalance(chain, address);
      results[chain] = balance;
    } catch (error) {
      console.error(`Failed to get balance for ${chain}:`, error);
      results[chain] = 0;
    }
  });

  await Promise.all(promises);
  return results;
}