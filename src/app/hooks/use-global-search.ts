import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi, clientsApi, servicesApi, staffApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import type { Appointment, Client, Office, Service, Staff } from '../types';

export interface SearchResult {
  kind: 'client' | 'staff' | 'service' | 'booking';
  id: string;
  title: string;
  subtitle?: string;
  office?: Office;
  href: string;
}

export function useGlobalSearch(rawQuery: string) {
  const [debounced, setDebounced] = useState(rawQuery);
  const offices = useOfficeStore((s) => s.offices);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(rawQuery.trim()), 150);
    return () => clearTimeout(id);
  }, [rawQuery]);

  // Deliberately unscoped — global search spans all offices
  const { data: clients = [] } = useQuery({
    queryKey: ['global-search', 'clients'],
    queryFn: () => clientsApi.getAll(),
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['global-search', 'staff'],
    queryFn: () => staffApi.getAll(),
  });
  const { data: services = [] } = useQuery({
    queryKey: ['global-search', 'services'],
    queryFn: () => servicesApi.getAll(),
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ['global-search', 'appointments'],
    queryFn: () => appointmentsApi.getAllAcrossOffices(),
  });

  return useMemo<SearchResult[]>(() => {
    if (!debounced) return [];
    const q = debounced.toLowerCase();
    const officeById = new Map(offices.map((o) => [o.id, o]));

    const clientResults: SearchResult[] = clients
      .filter((c: Client) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(debounced),
      )
      .slice(0, 6)
      .map((c) => ({
        kind: 'client',
        id: c.id,
        title: `${c.firstName} ${c.lastName}`,
        subtitle: c.phone,
        office: c.officeIds[0] ? officeById.get(c.officeIds[0]) : undefined,
        href: `/clients`,
      }));

    const staffResults: SearchResult[] = staff
      .filter((s: Staff) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((s) => ({
        kind: 'staff',
        id: s.id,
        title: `${s.firstName} ${s.lastName}`,
        subtitle: s.role,
        office: s.officeIds[0] ? officeById.get(s.officeIds[0]) : undefined,
        href: `/staff`,
      }));

    const serviceResults: SearchResult[] = services
      .filter((s: Service) => s.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((s) => ({
        kind: 'service',
        id: s.id,
        title: s.name,
        subtitle: `€${s.price} · ${s.duration}m`,
        office: officeById.get(s.officeId),
        href: `/services`,
      }));

    const bookingResults: SearchResult[] = bookings
      .filter((b: Appointment) => {
        const client = clients.find((c) => c.id === b.clientId);
        if (!client) return false;
        return `${client.firstName} ${client.lastName}`.toLowerCase().includes(q);
      })
      .slice(0, 5)
      .map((b) => {
        const client = clients.find((c) => c.id === b.clientId);
        return {
          kind: 'booking',
          id: b.id,
          title: client ? `${client.firstName} ${client.lastName}` : 'Booking',
          subtitle: new Date(b.startTime).toLocaleString(),
          office: officeById.get(b.locationId),
          href: `/bookings`,
        };
      });

    return [...clientResults, ...staffResults, ...serviceResults, ...bookingResults];
  }, [debounced, clients, staff, services, bookings, offices]);
}
