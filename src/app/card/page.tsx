import type { Metadata } from "next";
import { Suspense } from "react";
import FridgeCard from "@/components/FridgeCard";

export const metadata: Metadata = {
  title: "Rally — fridge card",
  description: "A printable one-page huddle plan for your household.",
};

export default function CardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bone" />}>
      <FridgeCard />
    </Suspense>
  );
}
