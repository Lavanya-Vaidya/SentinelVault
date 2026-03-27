"use client";

import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}

export default function Providers({ children }: any) {
  return children;
}