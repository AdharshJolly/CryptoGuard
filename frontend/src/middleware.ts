import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this",
);

// Routes that require user authentication
const userProtectedRoutes = ["/user"];

// Routes that require admin authentication
const adminProtectedRoutes = ["/admin"];

// Routes that are public
const publicRoutes = ["/", "/auth/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;

  // Allow API routes to pass through
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isUserProtected = userProtectedRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isAdminProtected = adminProtectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (!isUserProtected && !isAdminProtected) {
    return NextResponse.next();
  }

  // If no token, redirect to appropriate login
  if (!token) {
    if (isAdminProtected) {
      return NextResponse.redirect(new URL("/auth/admin", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;

    // Check role-based access
    if (isAdminProtected && userRole !== "admin") {
      return NextResponse.redirect(new URL("/auth/admin", request.url));
    }

    if (isUserProtected && userRole !== "user") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Invalid token, redirect to login
    const response = NextResponse.redirect(
      new URL(isAdminProtected ? "/auth/admin" : "/", request.url),
    );
    response.cookies.delete("auth-token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
