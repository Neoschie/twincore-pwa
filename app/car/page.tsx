import { Suspense } from "react";
import CarClient from "./CarClient";

export default function CarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8">Loading…</div>}>
      <CarClient />
    </Suspense>
  );
}