"use client";

import { useEffect, useState } from "react";

type SaveVenueButtonProps = {
  venueId: string;
  venueName: string;
};

type SavedVenue = {
  id: string;
  name: string;
};

const STORAGE_KEY = "twincore-saved-venues";

export default function SaveVenueButton({
  venueId,
  venueName,
}: SaveVenueButtonProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const storedVenues = localStorage.getItem(STORAGE_KEY);
      const savedVenues: SavedVenue[] = storedVenues
        ? JSON.parse(storedVenues)
        : [];

      setIsSaved(savedVenues.some((venue) => venue.id === venueId));
    } catch (error) {
      console.error("Unable to read saved venues:", error);
    }
  }, [venueId]);

  function handleSave() {
    try {
      const storedVenues = localStorage.getItem(STORAGE_KEY);
      const savedVenues: SavedVenue[] = storedVenues
        ? JSON.parse(storedVenues)
        : [];

      if (savedVenues.some((venue) => venue.id === venueId)) {
        const updatedVenues = savedVenues.filter(
          (venue) => venue.id !== venueId,
        );

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVenues));
        setIsSaved(false);
        return;
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          ...savedVenues,
          {
            id: venueId,
            name: venueName,
          },
        ]),
      );

      setIsSaved(true);
    } catch (error) {
      console.error("Unable to save venue:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      aria-pressed={isSaved}
      className={`rounded-2xl border p-4 text-left transition ${
        isSaved
          ? "border-amber-300/30 bg-amber-300/10"
          : "border-white/10 bg-black/20 hover:bg-white/[0.05]"
      }`}
    >
      <div className="text-xl">{isSaved ? "✅" : "🔖"}</div>

      <div className="mt-3 text-sm font-black text-white">
        {isSaved ? "Saved" : "Save"}
      </div>

      <div className="mt-1 text-xs text-white/45">
        {isSaved ? "Added to favorites" : "Add to favorites"}
      </div>
    </button>
  );
}