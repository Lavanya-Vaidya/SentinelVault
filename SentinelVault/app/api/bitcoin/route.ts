import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  try {
    if (action === "balance") {
      const res = await fetch(`https://blockchain.info/rawaddr/${address}`);
      if (!res.ok) throw new Error("Failed to fetch balance from blockchain.info");
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === "transactions") {
      const limit = searchParams.get("limit") || "50";
      const res = await fetch(`https://blockchain.info/rawaddr/${address}?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch transactions from blockchain.info");
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Bitcoin API proxy error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
