"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

/** Generate a signed, short-lived download URL for a stored artifact. */
export const getSignedDownloadUrl = action({
  args: { storageId: v.id("_storage") },
  handler: async (_ctx, args): Promise<string | null> => {
    const secret = process.env.DOWNLOAD_SECRET;
    if (!secret) {
      throw new Error("DOWNLOAD_SECRET env var not set");
    }

    const expires = String(Date.now() + 10 * 60 * 1000); // 10 minutes
    const data = `${args.storageId}:${expires}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const baseUrl = process.env.CONVEX_SITE_URL;
    if (!baseUrl) {
      throw new Error("CONVEX_SITE_URL env var not set");
    }

    return `${baseUrl}/api/download?id=${encodeURIComponent(args.storageId)}&expires=${expires}&sig=${hex}`;
  },
});
