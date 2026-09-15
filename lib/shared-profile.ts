import { supabase } from "@/lib/supabase/client";

export type SharedProfile = {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function getSharedProfile(
  userId: string,
): Promise<SharedProfile | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id,display_name,photo_url,created_at,updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle<SharedProfile>();

  if (error) {
    console.error("PROFILE LOOKUP ERROR:", error);
    return null;
  }

  return data ?? null;
}

export async function upsertSharedProfile(input: {
  userId: string;
  displayName: string;
  photoUrl?: string | null;
}) {
  const displayName = input.displayName.trim();

  if (!input.userId || !displayName) {
    throw new Error("A user ID and display name are required.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: input.userId,
        display_name: displayName,
        photo_url: input.photoUrl?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    )
    .select(
      "user_id,display_name,photo_url,created_at,updated_at",
    )
    .single<SharedProfile>();

  if (error) {
    throw new Error(
      error.message || "Unable to save the shared profile.",
    );
  }

  return data;
}
