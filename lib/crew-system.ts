import { supabase } from "@/lib/supabase/client";

export type TwinCoreCrew = {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  inviteCode: string;
  memberCount: number;
  createdAt: string;
  active: boolean;
};

type CrewRow = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
};

type MembershipRow = {
  crew_id: string | null;
};

type OwnerMembershipRow = {
  member_name: string | null;
  crew_owner: string | null;
};

async function countMembers(crewId: string) {
  const { count, error } = await supabase
    .from("crew_members")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("crew_id", crewId);

  if (error) {
    throw new Error(
      error.message || "Unable to count crew members.",
    );
  }

  return count ?? 0;
}

async function resolveOwnerName(
  crewId: string,
  ownerId: string,
) {
  const { data } = await supabase
    .from("crew_members")
    .select("member_name,crew_owner")
    .eq("crew_id", crewId)
    .eq("user_id", ownerId)
    .maybeSingle<OwnerMembershipRow>();

  return (
    data?.member_name?.trim() ||
    data?.crew_owner?.trim() ||
    "Crew Owner"
  );
}

async function mapCrew(row: CrewRow): Promise<TwinCoreCrew> {
  const [memberCount, ownerName] = await Promise.all([
    countMembers(row.id),
    resolveOwnerName(row.id, row.owner_id),
  ]);

  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    ownerName,
    inviteCode: row.invite_code,
    memberCount,
    createdAt: row.created_at,
    active: true,
  };
}

export async function getActiveCrew(
  userId: string,
): Promise<TwinCoreCrew | null> {
  if (!userId) return null;

  const { data: membership, error: membershipError } =
    await supabase
      .from("crew_members")
      .select("crew_id")
      .eq("user_id", userId)
      .not("crew_id", "is", null)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle<MembershipRow>();

  if (membershipError) {
    throw new Error(
      membershipError.message ||
        "Unable to load your crew membership.",
    );
  }

  if (!membership?.crew_id) return null;

  const { data: crew, error: crewError } = await supabase
    .from("crews")
    .select("id,name,invite_code,owner_id,created_at")
    .eq("id", membership.crew_id)
    .maybeSingle<CrewRow>();

  if (crewError) {
    throw new Error(
      crewError.message || "Unable to load your crew.",
    );
  }

  if (!crew) return null;

  return mapCrew(crew);
}

export async function createCrew(
  _userId: string,
  ownerName: string,
  crewName: string,
): Promise<TwinCoreCrew> {
  const { data, error } = await supabase.rpc(
    "create_twincore_crew",
    {
      p_name: crewName.trim(),
      p_owner_name: ownerName.trim(),
    },
  );

  if (error) {
    throw new Error(
      error.message || "Unable to create the crew.",
    );
  }

  const row = data as CrewRow;

  return mapCrew(row);
}

export async function saveCrew(
  _userId: string,
  crew: TwinCoreCrew,
) {
  const { error } = await supabase
    .from("crews")
    .update({
      name: crew.name,
    })
    .eq("id", crew.id);

  if (error) {
    throw new Error(
      error.message || "Unable to save the crew.",
    );
  }
}

export async function leaveCrew(
  userId: string,
  crewId?: string,
) {
  if (!userId || !crewId) {
    throw new Error("Crew information is missing.");
  }

  const { data: crew, error: crewError } = await supabase
    .from("crews")
    .select("owner_id")
    .eq("id", crewId)
    .maybeSingle<{ owner_id: string }>();

  if (crewError) {
    throw new Error(crewError.message);
  }

  if (crew?.owner_id === userId) {
    throw new Error(
      "The crew owner must delete the crew instead of leaving it.",
    );
  }

  const { error } = await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      error.message || "Unable to leave the crew.",
    );
  }
}

export async function deleteCrew(
  userId: string,
  crewId?: string,
) {
  if (!userId || !crewId) {
    throw new Error("Crew information is missing.");
  }

  const { error } = await supabase
    .from("crews")
    .delete()
    .eq("id", crewId)
    .eq("owner_id", userId);

  if (error) {
    throw new Error(
      error.message || "Unable to delete the crew.",
    );
  }
}

export function isCrewOwner(
  crew: TwinCoreCrew | null,
  userId: string | null,
) {
  return Boolean(
    crew &&
      userId &&
      crew.ownerId === userId,
  );
}

export function subscribeToCrew(listener: () => void) {
  const channel = supabase
    .channel(`crew-system-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "crews",
      },
      listener,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "crew_members",
      },
      listener,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
