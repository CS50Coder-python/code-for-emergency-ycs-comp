import type { Level } from "./risk";

// What the user tells us about who lives in the house.
export type Household = {
  needsHelp: boolean; // young children, older adults, or a disability
  noCar: boolean;
  medical: boolean; // daily medication or powered medical equipment
  pets: boolean;
};

export type ChecklistGroup = { title: string; items: string[] };

// The checklist changes with the risk level and the household, so a family
// with no car or a person on oxygen gets the steps that matter for them first.
export function buildChecklist(level: Level, h: Household): ChecklistGroup[] {
  const now: string[] = [];
  const bag: string[] = [];
  const plan: string[] = [];

  const urgent = level === "High" || level === "Extreme";

  if (level === "Extreme") {
    now.push("If officials have ordered evacuation, leave now. Do not wait for a second message.");
  }
  if (urgent) {
    now.push("Back the car into the driveway, fuel above half, keys in your pocket.");
    now.push("Close all windows and doors. Move flammable furniture, propane, and firewood away from the house.");
    now.push("Sign up for county emergency alerts and keep the phone charged and loud.");
  } else {
    now.push("Check the map again this evening. Fires move fastest in afternoon wind.");
    now.push("Clear leaves and dry brush within 1.5 metres of the walls.");
    now.push("Agree on one meeting place outside the neighbourhood and write it on the fridge.");
  }

  if (h.noCar) {
    now.unshift(
      urgent
        ? "You do not have a car: arrange your ride now, before roads close. Call a neighbour, family, or 211 for transport help. Leave one risk level earlier than others."
        : "You do not have a car: decide today who will drive you, and a backup. Save both numbers."
    );
  }
  if (h.needsHelp) {
    now.push(
      urgent
        ? "Someone here needs extra time to move. Start packing and loading now, not when the order comes."
        : "Plan for the person who needs help: who gets them, how long it takes, and what they must bring."
    );
  }
  if (h.medical) {
    now.push("Pack seven days of medication and prescriptions. If any equipment needs power, put a charged battery or car adapter with it.");
    bag.push("Medication list, dosages, doctor and pharmacy phone numbers");
  }
  if (h.pets) {
    now.push("Put pet carriers by the door. Many shelters do not take animals, so find a pet-friendly option now.");
    bag.push("Pet food, leash or carrier, vaccination record");
  }

  bag.push(
    "Water (4 litres per person per day) and three days of food",
    "N95 masks for smoke, one per person",
    "Photo ID, insurance papers, and a phone charger",
    "Flashlight, first-aid kit, and cash",
    "A change of clothes and sturdy shoes"
  );

  plan.push(
    "Know two ways out of the neighbourhood, in case one road is blocked by fire or traffic.",
    "Tell one person outside the area where you will go. Text them when you leave and when you arrive.",
    "Take a photo of each room for insurance. It takes two minutes and saves months.",
    "Rerun this check whenever the wind changes or a warning is issued."
  );

  return [
    { title: urgent ? "Do this now" : "Do this today", items: now },
    { title: "Go bag", items: bag },
    { title: "Plan", items: plan },
  ];
}
