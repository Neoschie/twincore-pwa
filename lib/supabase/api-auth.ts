import { createClient, type User } from "@supabase/supabase-js";

export async function getAuthenticatedApiUser(
  request: Request,
): Promise<User | null> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authorization.slice("Bearer ".length).trim();

  if (!accessToken) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase API authentication is not configured.");
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export function isPrelaunchUserAllowed(user: User): boolean {
  if (process.env.TWINCORE_PRELAUNCH !== "true") {
    return true;
  }

  const allowedUserIds = new Set(
    (process.env.TWINCORE_PRELAUNCH_ALLOWED_USER_IDS ?? "")
      .split(",")
      .map((userId) => userId.trim())
      .filter(Boolean),
  );

  return allowedUserIds.has(user.id);
}

export async function getAuthorizedApiUser(
  request: Request,
): Promise<User | null> {
  const user = await getAuthenticatedApiUser(request);

  if (!user || !isPrelaunchUserAllowed(user)) {
    return null;
  }

  return user;
}
