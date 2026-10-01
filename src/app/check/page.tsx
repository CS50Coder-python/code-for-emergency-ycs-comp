import { Suspense } from "react";
import CheckClient from "@/components/CheckClient";

export default function CheckPage() {
  return (
    <Suspense>
      <CheckClient />
    </Suspense>
  );
}
