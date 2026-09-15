"use client";

import {
  DEFAULT_PRESENCE,
  resolvePresence,
  type TwinPresenceSnapshot,
} from "./presence-engine";

import type {
  TwinPresenceEvent,
  TwinPresenceSource,
} from "./presence-events";

type Listener = () => void;

let events: TwinPresenceEvent[] = [];
let snapshot: TwinPresenceSnapshot = DEFAULT_PRESENCE;

const listeners = new Set<Listener>();

function emit() {
  snapshot = resolvePresence(events);

  for (const listener of listeners) {
    listener();
  }
}

export function getPresenceSnapshot(): TwinPresenceSnapshot {
  return snapshot;
}

export function getPresenceEvents(): TwinPresenceEvent[] {
  return [...events];
}

export function subscribePresence(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function pushPresenceEvent(event: TwinPresenceEvent) {
  events = [
    ...events.filter((existing) => existing.id !== event.id),
    event,
  ];

  emit();

  return event.id;
}

export function removePresenceEvent(id: string) {
  events = events.filter((event) => event.id !== id);
  emit();
}

export function clearPresenceSource(source: TwinPresenceSource) {
  events = events.filter((event) => event.source !== source);
  emit();
}

export function clearPresence() {
  events = [];
  emit();
}

export function refreshPresence() {
  emit();
}
