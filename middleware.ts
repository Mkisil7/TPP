import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Routes reachable without a session. API routes enforce their own auth
// (returning JSON 401) instead of redirecting.
const PUBLIC_PATHS = ["/login", "/verify", "/auth", "/api"];

const DID_COOKIE = "adt_did"; // trusted-device id
const DV_COOKIE = "adt_dv"; // fast-path marker: device verified for this user id

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  // Email sign-in links may land on the site root (Supabase falls back to the
  // Site URL when a redirect isn't allowlisted). Forward them to /auth/confirm.
  if ((path === "/" || path === "/login") && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    // 2FA gate: a session on an unverified device may only reach /verify,
    // /auth/* and /login until the emailed code/link is completed.
    const deviceVerified = await isDeviceVerified(supabase, request, response, user.id);
    const verifyExempt =
      path === "/verify" ||
      path === "/login" ||
      path.startsWith("/auth") ||
      path.startsWith("/verify/");

    if (!deviceVerified && !verifyExempt) {
      if (path.startsWith("/api")) {
        return NextResponse.json({ error: "Device not verified" }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/verify";
      return NextResponse.redirect(url);
    }

    if (deviceVerified && path === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

type SB = ReturnType<typeof createServerClient>;

async function isDeviceVerified(
  supabase: SB,
  request: NextRequest,
  response: NextResponse,
  userId: string,
): Promise<boolean> {
  // Fast path: marker cookie set at verification time.
  if (request.cookies.get(DV_COOKIE)?.value === userId) return true;

  // Slow path: check the trusted-devices table, then set the marker.
  const did = request.cookies.get(DID_COOKIE)?.value;
  if (!did) return false;
  const { data } = await supabase
    .from("trusted_devices")
    .select("device_id")
    .eq("user_id", userId)
    .eq("device_id", did)
    .maybeSingle();
  if (!data) return false;

  response.cookies.set(DV_COOKIE, userId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return true;
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
