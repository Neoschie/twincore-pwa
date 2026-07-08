export function ActivityCard() {
  return null;
}

type Props = {
  connected: number;
  location: boolean;
  ghostMode: boolean;
  trustedOnly: boolean;
};

export function ActivityCard({
  connected,
  location,
  ghostMode,
  trustedOnly,
}: Props) {
  const items = [
    {
      label: "Crew Connected",
      value: `${connected}`,
    },
    {
      label: "Location",
      value: location ? "On" : "Off",
    },
    {
      label: "Ghost Mode",
      value: ghostMode ? "On" : "Off",
    },
    {
      label: "Visibility",
      value: trustedOnly ? "Trusted" : "Open",
    },
  ];

  return (
    <section className="mb-8">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">
            Today's Activity
          </h3>
          <p className="mt-1 text-sm text-white/45">
            A snapshot of your current TwinCore state.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="text-2xl font-black text-white">
                {item.value}
              </div>

              <div className="mt-1 text-xs font-medium text-white/45">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}