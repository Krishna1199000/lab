import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  const isAuthenticated = !!token

  // Paths that require authentication
  const authRoutes = ["/dashboard"]
  // Paths that should not be accessible if authenticated
  const publicRoutes = ["/signin", "/signup"]

  const isAccessingAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )
  const isAccessingPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirect authenticated users away from public routes
  if (isAuthenticated && isAccessingPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Redirect unauthenticated users away from protected routes
  if (!isAuthenticated && isAccessingAuthRoute) {
    return NextResponse.redirect(new URL("/signin", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/signin", "/signup"],
}

