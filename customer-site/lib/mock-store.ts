// In-memory appointments store for the customer-site API.
// Persists to data/web-bookings.json at repo root so the dashboard can
// read bookings made through the public website.

import fs from 'fs';
import path from 'path';

export interface WebBooking {
  id: string;
  serviceId: string;
  staffId: string;
  officeId: string;
  startTime: string;  // ISO
  endTime: string;    // ISO
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  notes?: string;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  source: 'web';
  createdAt: string;
}

// ─── Persistence ────────────────────────────────────────────────────────────

const DATA_FILE = path.join(process.cwd(), '..', 'data', 'web-bookings.json');

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadFromDisk(): WebBooking[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as WebBooking[];
  } catch {
    return [];
  }
}

function saveToDisk(bookings: WebBooking[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[mock-store] failed to persist bookings:', err);
  }
}

// ─── Module-level store ──────────────────────────────────────────────────────
// Loaded once at module init; all mutations also write through to disk.

let _bookings: WebBooking[] = loadFromDisk();

export const bookingStore = {
  getAll(): WebBooking[] {
    return _bookings;
  },

  getById(id: string): WebBooking | undefined {
    return _bookings.find(b => b.id === id);
  },

  add(booking: WebBooking): WebBooking {
    _bookings = [..._bookings, booking];
    saveToDisk(_bookings);
    return booking;
  },

  update(id: string, patch: Partial<WebBooking>): WebBooking | undefined {
    const idx = _bookings.findIndex(b => b.id === id);
    if (idx === -1) return undefined;
    const updated = { ..._bookings[idx], ...patch };
    _bookings = [..._bookings.slice(0, idx), updated, ..._bookings.slice(idx + 1)];
    saveToDisk(_bookings);
    return updated;
  },

  // Returns all bookings that overlap the given [start, end) interval for a staff member.
  getConflicts(staffId: string, start: Date, end: Date): WebBooking[] {
    return _bookings.filter(b => {
      if (b.staffId !== staffId) return false;
      if (b.status === 'cancelled') return false;
      const bStart = new Date(b.startTime).getTime();
      const bEnd   = new Date(b.endTime).getTime();
      return bStart < end.getTime() && bEnd > start.getTime();
    });
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
