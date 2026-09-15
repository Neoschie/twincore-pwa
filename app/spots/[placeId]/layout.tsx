import type { ReactNode } from "react";

export function generateStaticParams() {
  return [{ placeId: "__native__" }];
}

export default function SpotDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
