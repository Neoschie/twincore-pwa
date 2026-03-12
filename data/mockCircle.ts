export type CrewStatus =
  | "not_joined"
  | "preparing"
  | "ready"
  | "out"
  | "support"
  | "heading_home"
  | "home_safe"
  | "offline";

export type CrewMember = {
  id: string;
  name: string;
  status: CrewStatus;
  batteryLevel?: number;
  isCurrentUser?: boolean;
};

export type Circle = {
  id: string;
  state: "fit_check" | "party_mode" | "closed";
  createdBy: string;
  members: CrewMember[];
};

export const mockCircle: Circle = {
  id: "circle_001",
  state: "fit_check",
  createdBy: "1",
  members: [
    { id: "1", name: "Neo", status: "ready", batteryLevel: 82, isCurrentUser: true },
    { id: "2", name: "Maya", status: "preparing", batteryLevel: 67 },
    { id: "3", name: "Jordan", status: "not_joined", batteryLevel: 91 },
    { id: "4", name: "Alex", status: "ready", batteryLevel: 54 },
  ],
};