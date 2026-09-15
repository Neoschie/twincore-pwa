import { Suspense } from "react";
import CarQueryBridge from "./CarQueryBridge";

export default function CarPage() {
  return (
    <Suspense fallback={null}>
      <CarQueryBridge />
    </Suspense>
  );
}
