import { NextRequest, NextResponse } from "next/server";
import { generateNonce } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // Generate a nonce for the address
    const nonce = generateNonce(address);

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Nonce generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
