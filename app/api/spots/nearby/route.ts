import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Latitude and longitude are required." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    spots: [
      {
        id: "harbour-social",
        name: "Harbour Social",
        category: "Nightlife",
        distanceKm: 0.6,
        vibe: "High Energy",
        crowdLevel: "Busy",
      },
      {
        id: "north-shore-kitchen",
        name: "North Shore Kitchen",
        category: "Food",
        distanceKm: 1.2,
        vibe: "Relaxed",
        crowdLevel: "Moderate",
      },
      {
        id: "waterfront-walk",
        name: "Waterfront Walk",
        category: "Outdoor",
        distanceKm: 0.9,
        vibe: "Calm",
        crowdLevel: "Light",
      },
    ],
  });
}