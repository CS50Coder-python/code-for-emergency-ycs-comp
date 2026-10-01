import type { Level } from "./risk";

// What the user tells us about who lives in the house.
export type Household = {
  needsHelp: boolean; // young children, older adults, or a disability
  noCar: boolean;
  medical: boolean; // daily medication or powered medical equipment
  pets: boolean;
};

// Each entry is a key into i18n.ts, so the list reads in any language.
export type ChecklistGroup = { title: string; items: string[] };

// The checklist changes with the risk level and the household, so a family
// with no car or a person on oxygen gets the steps that matter for them first.
export function buildChecklist(level: Level, h: Household): ChecklistGroup[] {
  const now: string[] = [];
  const bag: string[] = [];
  const plan: string[] = [];

  const urgent = level === "High" || level === "Extreme";

  if (level === "Extreme") now.push("cl.leave");
  if (urgent) now.push("cl.car", "cl.close", "cl.alerts");
  else now.push("cl.recheck", "cl.clear", "cl.meet");

  if (h.noCar) now.unshift(urgent ? "cl.noCar.urgent" : "cl.noCar.calm");
  if (h.needsHelp) now.push(urgent ? "cl.help.urgent" : "cl.help.calm");
  if (h.medical) { now.push("cl.medical"); bag.push("cl.medical.bag"); }
  if (h.pets) { now.push("cl.pets"); bag.push("cl.pets.bag"); }

  bag.push("cl.water", "cl.masks", "cl.id", "cl.light", "cl.clothes");
  plan.push("cl.twoWays", "cl.tell", "cl.photos", "cl.rerun");

  return [
    { title: urgent ? "cl.now" : "cl.today", items: now },
    { title: "cl.bag", items: bag },
    { title: "cl.plan", items: plan },
  ];
}
