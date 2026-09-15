export type NearbySpot = {
  id: string;
  name: string;
  category: string;
  address?: string;
  distanceKm: number;
  rating?: number;
  reviewCount?: number;
  isOpen?: boolean;
  closingTime?: string | null;
  vibe: string;
  status: string;
  note: string;
};

export const nearbySpots: NearbySpot[] = [
  {
    id: "spot-1",
    name: "Harbour Social",
    category: "Nightlife",
    distanceKm: 1.2,
    vibe: "High energy",
    status: "Open",
    note: "Busy social atmosphere with strong late-night activity.",
  },
  {
    id: "spot-2",
    name: "North Shore Kitchen",
    category: "Food",
    distanceKm: 0.8,
    vibe: "Relaxed",
    status: "Open",
    note: "Good option for food and a lower-energy reset.",
  },
  {
    id: "spot-3",
    name: "Community Arena",
    category: "Sports",
    distanceKm: 2.4,
    vibe: "Active",
    status: "Event tonight",
    note: "Local sports activity with moderate crowd energy.",
  },
  {
    id: "spot-4",
    name: "Waterfront Walk",
    category: "Outdoor",
    distanceKm: 1.6,
    vibe: "Calm",
    status: "Open",
    note: "Lower-energy outdoor option for a quieter evening.",
  },
  {
    id: "spot-5",
    name: "Stay In",
    category: "Stay In",
    distanceKm: 0,
    vibe: "Private",
    status: "Always available",
    note: "Best fallback when weather, fatigue, or safety makes staying in the better move.",
  },
];
