import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/api/download",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const storageId = url.searchParams.get("id");
    const expires = url.searchParams.get("expires");
    const sig = url.searchParams.get("sig");

    if (!storageId || !expires || !sig) {
      return new Response("Missing parameters", { status: 400 });
    }

    // Check expiry
    if (Date.now() > Number(expires)) {
      return new Response("Link expired", { status: 403 });
    }

    // Verify HMAC signature
    const secret = process.env.DOWNLOAD_SECRET;
    if (!secret) {
      return new Response("Server misconfigured", { status: 500 });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    const data = encoder.encode(`${storageId}:${expires}`);
    const expectedSig = await crypto.subtle.sign("HMAC", key, data);
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (sig !== expectedHex) {
      return new Response("Invalid signature", { status: 403 });
    }

    // Serve the file
    const blob = await ctx.storage.get(storageId as any);
    if (!blob) {
      return new Response("File not found", { status: 404 });
    }

    return new Response(blob, {
      headers: {
        "Content-Type": blob.type || "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=600",
      },
    });
  }),
});

export default http;
