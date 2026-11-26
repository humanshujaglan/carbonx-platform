import type { NextRequest } from "next/server";
import { isAddress } from "viem";
import { checkSponsor, listWinners, removeWinner } from "@/lib/bonanza";

// Listing and removing sponsors needs this key in the x-admin-key header
const isAdmin = (req: NextRequest) => !!process.env.BONANZA_ADMIN_KEY && req.headers.get("x-admin-key") === process.env.BONANZA_ADMIN_KEY;

/**
 * GET /api/bonanza?address=0x…  whether this sponsor won the bonanza (checks the chain and saves new winners)
 * GET /api/bonanza              every saved winner (admin)
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    if (!isAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ winners: await listWinners() });
  }
  if (!isAddress(address)) return Response.json({ error: "Invalid address" }, { status: 400 });
  try {
    const winner = await checkSponsor(address);
    return Response.json({ eligible: !!winner, winner: winner ?? null });
  } catch (e) {
    console.error("[bonanza] check failed", e);
    return Response.json({ error: "Could not check the chain" }, { status: 502 });
  }
}

/** DELETE /api/bonanza?address=0x…  removes a sponsor from the winners file (admin) */
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const address = req.nextUrl.searchParams.get("address");
  if (!address || !isAddress(address)) return Response.json({ error: "Invalid address" }, { status: 400 });
  return Response.json({ removed: await removeWinner(address) });
}
