import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getNonce, clearNonce, setSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { address, signature } = await request.json();

    if (!address || !signature) {
      return NextResponse.json(
        { error: "Address and signature are required" },
        { status: 400 },
      );
    }

    // Get the nonce that was issued to this address
    const nonce = getNonce(address);

    if (!nonce) {
      return NextResponse.json(
        { error: "No nonce found or nonce expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Verify the signature
    try {
      const recoveredAddress = ethers.verifyMessage(nonce, signature);

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return NextResponse.json(
          { error: "Signature verification failed" },
          { status: 401 },
        );
      }
    } catch (verifyError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Clear the used nonce
    clearNonce(address);

    // Create user session
    const user = {
      id: `user-${address.substring(0, 8)}`,
      role: "user" as const,
      address,
      name: "Anonymous Analyst",
    };

    await setSession(user);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Signature verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
