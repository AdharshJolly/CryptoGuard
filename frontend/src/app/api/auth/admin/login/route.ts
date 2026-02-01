import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate credentials against environment variables
    const validEmail = process.env.ADMIN_EMAIL || "admin@cryptoguard.io";
    const validPassword = process.env.ADMIN_PASSWORD || "admin123";

    // Allow both the configured env credentials AND the specific hardcoded fallback
    const isValidEnv = email === validEmail && password === validPassword;
    const isValidHardcoded =
      email === "admin@cryptoguard.io" && password === "admin123";

    if (!isValidEnv && !isValidHardcoded) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Create session
    const user = {
      id: "admin-01",
      role: "admin" as const,
      email,
      name: "Lead Investigator",
    };

    await setSession(user);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
