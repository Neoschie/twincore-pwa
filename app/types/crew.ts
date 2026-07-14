export type CrewStatus =
  | "checked_in"
  | "heading_home"
  | "offline"
  | "needs_help"
  | "at_home";

export interface CrewCoordinates {
  latitude: number;
  longitude: number;
}

export interface CrewMember {
  id: string;
  name: string;

  status: CrewStatus;

  locationEnabled: boolean;
  batteryLevel: number;

  lastSeen: string;

  latitude?: number;
  longitude?: number;

  trusted: boolean;

  checkInTime?: string;

  riskScore: number;
}