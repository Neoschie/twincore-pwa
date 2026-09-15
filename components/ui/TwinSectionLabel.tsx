type TwinSectionLabelProps = {
  children: React.ReactNode;
};

export function TwinSectionLabel({
  children,
}: TwinSectionLabelProps) {
  return (
    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/50">
      {children}
    </div>
  );
}
