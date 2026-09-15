"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";

export type VenueLiveReport = {
  id: string;
  title: string;
  area: string;
  activity_type: string | null;
  vibe: string;
  crowd_level: string | null;
  note: string | null;
  created_at: string;
  trusted: boolean | null;
};

type VenueLiveReportsProps = {
  venueName: string;
  onReportsChange?: (reports: VenueLiveReport[]) => void;
};

export default function VenueLiveReports({
  venueName,
  onReportsChange,
}: VenueLiveReportsProps) {
  const [reports, setReports] = useState<VenueLiveReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  async function loadReports() {
    const { data, error } = await supabase
      .from("spots_live_posts")
      .select(
        "id,title,area,activity_type,vibe,crowd_level,note,created_at,trusted",
      )
      .ilike("area", venueName)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Unable to load venue live reports:", error);
      setLoading(false);
      return;
    }

    const loadedReports = (data ?? []) as VenueLiveReport[];

setReports(loadedReports);

onReportsChange?.(loadedReports);
    setLoading(false);
  }

  void loadReports();

  const channel = supabase
    .channel(`venue-live-reports-${venueName}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "spots_live_posts",
      },
      async () => {
        await loadReports();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}, [venueName]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-center text-sm text-white/45">
        Loading live reports...
      </div>
    );
  }

 return (
  <div className="space-y-4">
    {reports.length > 0 ? (
      reports.map((report) => {
        const minutesAgo = Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(report.created_at).getTime()) / 60000,
          ),
        );

        const timeLabel =
          minutesAgo < 1
            ? "Just now"
            : minutesAgo === 1
              ? "1 min ago"
              : `${minutesAgo} min ago`;

        return (
          <div
            key={report.id}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">
                {report.title}
              </span>

              <span className="text-xs text-white/45">
                {timeLabel}
              </span>
            </div>

            <p className="mt-2 text-sm text-white/65">
              {report.note || "Live update shared from this venue."}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {report.crowd_level && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60">
                  {report.crowd_level}
                </span>
              )}

              {report.activity_type && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60">
                  {report.activity_type}
                </span>
              )}

              {report.trusted && (
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-100">
                  Trusted
                </span>
              )}
            </div>
          </div>
        );
      })
    ) : (
      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-center">
        <div className="text-sm font-semibold text-white/70">
          No live reports yet
        </div>

        <p className="mt-2 text-sm text-white/45">
          Be the first to share what is happening here.
        </p>
      </div>
    )}
  </div>
);
}