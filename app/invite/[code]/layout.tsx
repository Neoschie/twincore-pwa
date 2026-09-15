import type { ReactNode } from "react";

export function generateStaticParams() {
  return [{ code: "__native__" }];
}

export default function InviteCodeLayout({ children }: { children: ReactNode }) {
  return children;
}
