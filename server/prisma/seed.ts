import { PrismaClient, Prisma, StaffRole, AppointmentStatus, DayOfWeek, BreakType, Gender } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// De Legends Barbershop · two Vilnius offices.
//   Senamiestis  · Pilies g. 38   (Old Town flagship)
//   Naujamiestis · Gedimino pr. 45 (downtown branch)
// Six barbers (fictional LT names) split across both offices.
// Real De Legends service catalog cloned to both offices.

const WORKING_HOURS = {
  monday:    { isOpen: true,  openTime: '09:00', closeTime: '20:00' },
  tuesday:   { isOpen: true,  openTime: '09:00', closeTime: '20:00' },
  wednesday: { isOpen: true,  openTime: '09:00', closeTime: '20:00' },
  thursday:  { isOpen: true,  openTime: '09:00', closeTime: '20:00' },
  friday:    { isOpen: true,  openTime: '09:00', closeTime: '21:00' },
  saturday:  { isOpen: true,  openTime: '10:00', closeTime: '18:00' },
  sunday:    { isOpen: false, openTime: '10:00', closeTime: '16:00' },
};

const WEEKDAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// ── Photo banks ─────────────────────────────────────────
// Curated Unsplash portraits (face-cropped) + per-category service shots.
// Same staff URLs as the customer site so a barber's face is consistent
// across the booking page and the dashboard.

const STAFF_AVATARS: Record<string, string> = {
  Aurimas: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80&auto=format&fit=crop&crop=faces',
  Lukas:   'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80&auto=format&fit=crop&crop=faces',
  Šarūnas: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80&auto=format&fit=crop&crop=faces',
  Tomas:   'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80&auto=format&fit=crop&crop=faces',
  Domas:   'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=400&q=80&auto=format&fit=crop&crop=faces',
  Mantas:  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80&auto=format&fit=crop&crop=faces',
};

// 8 male + 6 female portrait URLs — separate pool from staff so client
// faces don't collide with barber faces in the UI.
const CLIENT_AVATARS_MALE: string[] = [
  'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=400&q=80&auto=format&fit=crop&crop=faces',
];

const CLIENT_AVATARS_FEMALE: string[] = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80&auto=format&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80&auto=format&fit=crop&crop=faces',
];

// One image per service category — keeps service tiles visually grouped
// without needing a unique photo for every line item.
const SERVICE_IMAGES_BY_CATEGORY: Record<string, string> = {
  'Kirpimai':      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80&auto=format&fit=crop',
  'Barzdos':       'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1200&q=80&auto=format&fit=crop',
  'Kombinacijos':  'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=1200&q=80&auto=format&fit=crop',
  'Vestuvės':      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1200&q=80&auto=format&fit=crop',
  'Veido ir kūno': 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&q=80&auto=format&fit=crop',
};

// Service catalog — same for both offices. Tuple is [category, name, price, duration, description].
type ServiceRow = [
  category: 'Kirpimai' | 'Barzdos' | 'Kombinacijos' | 'Vestuvės' | 'Veido ir kūno',
  name: string,
  price: number,
  duration: number,
  description: string,
];

const CATALOG: ServiceRow[] = [
  // Cuts
  ['Kirpimai', 'Kirpimas Pro',           34.99, 45, 'Signature haircut + scrub + masažas + galvos plovimas + nosies ir ausų valymas'],
  ['Kirpimai', 'Kirpimas Pro Max',       44.99, 60, 'Signature haircut + barzdos formavimas + scrub + masažas + galvos plovimas + nosies ir ausų valymas'],
  ['Kirpimai', 'Kirpimas Pro Maxx',      49.99, 75, 'Pro Max + atjauninanti kolageno kaukė'],
  ['Kirpimai', 'Galvos skutimas',        59.99, 60, 'Pilnas galvos skutimas + skutimo procedūra peiliu + scrub + masažas + galvos plovimas + ausų ir nosies valymas'],
  ['Kirpimai', 'Vaikiškas kirpimas',     24.99, 30, 'Vaikams nuo 1 iki 9 metų — profesionalus formavimas'],
  // Beard
  ['Barzdos',  'Barzda',                 24.99, 30, 'Custom barzdos formavimas + masažas + skutimosi kremas'],
  ['Barzdos',  'Barzda Pro',             34.99, 45, 'Barzda + gilus scrub + masažas + antakių formavimas'],
  ['Barzdos',  'Barzda Pro Max',         39.99, 60, 'Barzda Pro + atjauninanti kolageno kaukė'],
  // Wedding
  ['Vestuvės', 'Jaunikis',               59.99, 75, 'Kirpimas + barzda + skutimas + scrub + kolageno kaukė + masažas + galvos plovimas + nosies valymas + karštas rankšluostis + nemokami gėrimai'],
  ['Vestuvės', 'Klasikinis jaunikis',    74.99, 90, 'Kirpimas + barzda + 24K aukso kolageno kaukė + masažas + galvos plovimas + nosies ir ausų valymas + karštas rankšluostis'],
  ['Vestuvės', 'Jaunikis Plius',        134.99, 120,'Pilna prabanga: kirpimas + barzda + klasikinis skutimas + veido procedūra + 24K aukso kaukė + masažas + galvos plovimas + nosies ir ausų valymas + DE LEGENDS kvepalų purškimas'],
  ['Vestuvės', 'LEGENDS VIP',           199.99, 150,'Klasikinis kirpimas + barzdos formavimas + barzdos gydymas + antakių formavimas + asmeninė konsultacija + prabangi veido procedūra + 24K aukso kaukė + galvos masažas + karšto rankšluosčio skutimas + plaukų plovimas + ausų ir nosies valymas + rankų masažas + nemokami gėrimai + dovanų rinkinys'],
  // Wellness
  ['Veido ir kūno', 'Veido procedūra',    9.99, 20, 'Scrub + karštas rankšluostis + masažas'],
  ['Veido ir kūno', 'Veido procedūra X', 14.99, 30, 'Eksfoliacija + 24K aukso kolageno kaukė + karštas rankšluostis + masažas'],
  ['Veido ir kūno', 'Galvos masažas',    14.99, 20, 'Galvos masažas + scrub'],
  ['Veido ir kūno', 'Ausų valymas vašku',11.99, 20, 'Ear-candling rankų darbo žvakėmis iš JAV, iš aukštos kokybės bičių vaško'],
  // Combo
  ['Kombinacijos', 'Kirpimas + barzda',  49.99, 75, 'Kombinuota paslauga — kirpimas Pro + barzda'],
];

async function main() {
  console.log('Seeding…');

  // Wipe in FK-safe order
  await prisma.appointment.deleteMany();
  await prisma.break.deleteMany();
  await prisma.absence.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.clientOffice.deleteMany();
  await prisma.staffOffice.deleteMany();
  await prisma.accountOffice.deleteMany();
  await prisma.service.deleteMany();
  await prisma.category.deleteMany();
  await prisma.client.deleteMany();
  await prisma.account.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.office.deleteMany();
  await prisma.tenant.deleteMany();

  const tenant = await prisma.tenant.create({
    data: {
      name: 'De Legends Barbershop',
      email: 'contact@delegendsbarbershop.lt',
      phone: '+37066375648',
      language: 'lt',
      theme: 'dark',
      workingHours: WORKING_HOURS,
    },
  });

  // Two offices
  const officeA = await prisma.office.create({
    data: {
      tenantId: tenant.id,
      name: 'Senamiestis',
      address: 'Pilies g. 38, Vilnius',
      phone: '+37066375648',
      timezone: 'Europe/Vilnius',
    },
  });
  const officeB = await prisma.office.create({
    data: {
      tenantId: tenant.id,
      name: 'Naujamiestis',
      address: 'Gedimino pr. 45, Vilnius',
      phone: '+37060000002',
      timezone: 'Europe/Vilnius',
    },
  });

  // Owner staff (Aurimas) + dashboard login.
  const passwordHash = await argon2.hash('password');
  const ownerStaff = await prisma.staff.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Aurimas',
      lastName: 'Petrauskas',
      email: 'owner@delegendsbarbershop.lt',
      phone: '+37066375648',
      role: StaffRole.owner,
      isActive: true,
      avatarUrl: STAFF_AVATARS['Aurimas'],
      officeLinks: { create: [{ officeId: officeA.id }, { officeId: officeB.id }] },
    },
  });

  await prisma.account.create({
    data: {
      tenantId: tenant.id,
      email: 'owner@delegendsbarbershop.lt',
      passwordHash,
      firstName: 'Aurimas',
      lastName: 'Petrauskas',
      role: StaffRole.owner,
      staffId: ownerStaff.id,
      officeLinks: { create: [{ officeId: officeA.id }, { officeId: officeB.id }] },
    },
  });

  // Five more (fictional LT names) — three per office, plus two who float.
  const staffSeed = [
    { firstName: 'Lukas',   lastName: 'Kazlauskas',    email: 'lukas@delegendsbarbershop.lt',   offices: [officeA.id] },
    { firstName: 'Šarūnas', lastName: 'Jankauskas',    email: 'sarunas@delegendsbarbershop.lt', offices: [officeA.id, officeB.id] },
    { firstName: 'Tomas',   lastName: 'Stankevičius',  email: 'tomas@delegendsbarbershop.lt',   offices: [officeB.id] },
    { firstName: 'Domas',   lastName: 'Vasiliauskas',  email: 'domas@delegendsbarbershop.lt',   offices: [officeB.id] },
    { firstName: 'Mantas',  lastName: 'Bružas',        email: 'mantas@delegendsbarbershop.lt',  offices: [officeA.id] },
  ];
  const staff = [ownerStaff];
  for (const s of staffSeed) {
    const created = await prisma.staff.create({
      data: {
        tenantId: tenant.id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: '+37066375648',
        role: StaffRole.barber,
        isActive: true,
        avatarUrl: STAFF_AVATARS[s.firstName] ?? null,
        officeLinks: { create: s.offices.map((officeId) => ({ officeId })) },
      },
    });
    staff.push(created);
  }

  // Default Mon–Sat shifts + lunch break for every staff member.
  for (const member of staff) {
    for (const day of WEEKDAYS) {
      await prisma.shift.create({
        data: { staffId: member.id, dayOfWeek: day, startTime: '09:00', endTime: '18:00' },
      });
      await prisma.break.create({
        data: { staffId: member.id, dayOfWeek: day, startTime: '13:00', endTime: '14:00', type: BreakType.lunch },
      });
    }
  }

  // Categories — created once per tenant.
  const catNames = ['Kirpimai', 'Barzdos', 'Kombinacijos', 'Vestuvės', 'Veido ir kūno'] as const;
  const categories: Record<(typeof catNames)[number], { id: string }> = {} as never;
  for (const name of catNames) {
    categories[name] = await prisma.category.create({ data: { tenantId: tenant.id, name } });
  }

  // Services — clone the full catalog into BOTH offices so a customer
  // booking in either location sees the same menu and pricing.
  const services: { id: string; name: string; officeId: string; duration: number }[] = [];
  for (const office of [officeA, officeB]) {
    for (const [cat, name, price, duration, description] of CATALOG) {
      const s = await prisma.service.create({
        data: {
          tenantId: tenant.id,
          officeId: office.id,
          categoryId: categories[cat].id,
          name,
          description,
          price,
          duration,
          imageUrl: SERVICE_IMAGES_BY_CATEGORY[cat] ?? null,
        },
      });
      services.push({ id: s.id, name: s.name, officeId: s.officeId, duration: s.duration });
    }
  }

  // ── Client roster — believable 40-strong book for two shops.
  // Heavy male skew (barbershop), with a small female contingent who book
  // women's cuts / partner gift cards. Notes, missing emails, and multi-
  // office links sprinkled in so the clients page feels operated-on, not seeded.
  const FEMALE_FIRST = ['Ieva', 'Justė', 'Greta', 'Rūta', 'Akvilė', 'Kamilė', 'Ugnė', 'Eglė', 'Gabija', 'Aistė'];
  const MALE_FIRST = [
    'Marius', 'Tadas', 'Domas', 'Kęstutis', 'Edgaras', 'Rokas', 'Justas', 'Mantas',
    'Karolis', 'Mindaugas', 'Paulius', 'Andrius', 'Darius', 'Vytautas', 'Robertas',
    'Eimantas', 'Gediminas', 'Linas', 'Saulius', 'Rimas', 'Adas', 'Nerijus',
    'Egidijus', 'Ignas', 'Žygimantas', 'Tautvydas', 'Aurimas', 'Lukas', 'Tomas', 'Šarūnas',
  ];
  const LASTS = [
    'Petrauskas', 'Kaminskas', 'Stankevičius', 'Bružas', 'Čepulis', 'Gintautas',
    'Kazlauskas', 'Jankauskas', 'Vasiliauskas', 'Žukauskas', 'Paulauskas', 'Adamonis',
    'Šimkus', 'Norkus', 'Mockus', 'Vaitiekūnas', 'Liutkevičius', 'Daukša',
    'Blažys', 'Sabonis', 'Petraitis', 'Urbonas', 'Kasparavičius', 'Šimkevičius',
  ];
  // ~5/13 of clients get an empty note (most don't need one).
  const NOTE_POOL = [
    '', '', '', '', '',
    'Reguliarus kas 3 sav.',
    'Mėgsta tylą kirpimo metu.',
    'Visada renkasi Tomą.',
    'Alergiškas kvapams — be kvapnių aliejų.',
    'Patinka rytinė rezervacija.',
    'Skutosi tik klasikine geležte.',
    'Pageidauja trumpo pokalbio.',
    'Atsako lėtai į žinutes — geriau skambinti.',
  ];

  type ClientSeed = { firstName: string; lastName: string; gender: Gender };
  // Generate ~200 unique full-name combinations by walking the Cartesian
  // product of (firsts × lasts) with a coprime stride. Two-shop salons
  // accumulate this many active clients within the first year of operation.
  const allFirsts: { name: string; gender: Gender }[] = [
    ...FEMALE_FIRST.map((name) => ({ name, gender: Gender.female })),
    ...MALE_FIRST.map((name) => ({ name, gender: Gender.male })),
  ];
  const TARGET_CLIENT_COUNT = 200;
  const clientRoster: ClientSeed[] = [];
  for (let i = 0; i < TARGET_CLIENT_COUNT; i++) {
    const f = allFirsts[i % allFirsts.length];
    const l = LASTS[(Math.floor(i / allFirsts.length) * 7 + i) % LASTS.length];
    clientRoster.push({ firstName: f.name, lastName: l, gender: f.gender });
  }

  const clients = await Promise.all(
    clientRoster.map((c, i) => {
      const slug = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
      // ~25% of clients are walk-ins with no email on file.
      const email = i % 4 === 3 ? '' : `${slug(c.firstName)}.${slug(c.lastName)}@example.lt`;
      // 20% of clients book at both shops — captures the "switches based on which side of town they're on" pattern.
      const officeLinks = i % 5 === 0
        ? { create: [{ officeId: officeA.id }, { officeId: officeB.id }] }
        : { create: [{ officeId: i % 2 === 0 ? officeA.id : officeB.id }] };
      // Pick a face from the gender-matched pool, rotating with a coprime
      // multiplier so adjacent clients don't share a portrait.
      const pool = c.gender === Gender.female ? CLIENT_AVATARS_FEMALE : CLIENT_AVATARS_MALE;
      const avatarUrl = pool[(i * 5) % pool.length];
      return prisma.client.create({
        data: {
          tenantId: tenant.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email,
          phone: `+3706${String(10000000 + i * 7919).slice(0, 7)}`,
          notes: NOTE_POOL[(i * 7) % NOTE_POOL.length],
          gender: c.gender,
          avatarUrl,
          officeLinks,
        },
      });
    }),
  );

  // ── Appointments ────────────────────────────────────────
  // Generate ~6 months of realistic operating history so the dashboard's
  // analytics, retention, and revenue charts have something honest to draw.
  // Window: 180 days back → 14 days forward. Skipping Sundays (except today
  // if it happens to land on one, so the dashboard never looks empty).
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const officeStaffIds: Record<string, string[]> = {
    [officeA.id]: [
      ownerStaff.id,
      ...staffSeed
        .map((s, i) => (s.offices.includes(officeA.id) ? staff[i + 1].id : null))
        .filter((x): x is string => x !== null),
    ],
    [officeB.id]: [
      ownerStaff.id,
      ...staffSeed
        .map((s, i) => (s.offices.includes(officeB.id) ? staff[i + 1].id : null))
        .filter((x): x is string => x !== null),
    ],
  };

  const officeServices: Record<string, typeof services> = {
    [officeA.id]: services.filter((s) => s.officeId === officeA.id),
    [officeB.id]: services.filter((s) => s.officeId === officeB.id),
  };

  const taken = new Set<string>();
  const apptRows: Prisma.AppointmentCreateManyInput[] = [];
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const nowHour = new Date().getHours();

  // Loyalty buckets: real shops follow a power curve where ~30% of clients
  // produce ~70% of bookings (the "regulars"), the next 50% are occasional,
  // and the last 20% are walk-ins / one-timers. Picking with these weights
  // makes the clients page feel real — a few VIPs with 30+ visits, lots of
  // mid-tier regulars, and a long tail of single-visit names.
  const regulars = clients.slice(0, Math.floor(clients.length * 0.30));
  const occasionals = clients.slice(Math.floor(clients.length * 0.30), Math.floor(clients.length * 0.80));
  const walkins = clients.slice(Math.floor(clients.length * 0.80));
  const pickClient = () => {
    const r = Math.random();
    if (r < 0.70) return pick(regulars);
    if (r < 0.95) return pick(occasionals);
    return pick(walkins);
  };

  for (let dayOffset = -180; dayOffset <= 14; dayOffset++) {
    const day = new Date(today);
    day.setDate(today.getDate() + dayOffset);
    const dow = day.getDay(); // 0=Sun, 6=Sat
    // Skip Sundays — except when today is Sunday, so the dashboard never lands empty.
    if (dow === 0 && dayOffset !== 0) continue;

    // Real volume curve. Days within the visible window of the dashboard
    // (today ± 7) get a boosted count so the calendar always looks busy
    // when the salon owner opens it. Older history keeps a normal cadence.
    const isVisible = dayOffset >= -3 && dayOffset <= 7;
    let count: number;
    if (dayOffset === 0 && dow === 0) {
      count = 14; // Sunday-today special — keep the dashboard pulsing
    } else if (dow === 6) {
      count = (isVisible ? 24 : 18) + Math.floor(Math.random() * 9); // Saturday: 24-32 (visible) / 18-26 (older)
    } else if (dow === 5) {
      count = (isVisible ? 20 : 14) + Math.floor(Math.random() * 7); // Friday: 20-26 (visible) / 14-20 (older)
    } else {
      count = (isVisible ? 18 : 10) + Math.floor(Math.random() * 9); // Mon-Thu: 18-26 (visible) / 10-18 (older)
    }

    for (let i = 0; i < count; i++) {
      const officeId = i % 2 === 0 ? officeA.id : officeB.id;
      const staffId = pick(officeStaffIds[officeId]);
      const svc = pick(officeServices[officeId]);
      const client = pickClient();

      let placed = false;
      for (let attempt = 0; attempt < 25 && !placed; attempt++) {
        const hour = 9 + Math.floor(Math.random() * 9); // 9..17
        if (hour === 13) continue; // lunch break
        const minute = Math.random() < 0.5 ? 0 : 30;
        const slotKey = `${staffId}-${dayOffset}-${hour * 60 + minute}`;
        if (taken.has(slotKey)) continue;
        taken.add(slotKey);

        const start = new Date(day);
        start.setHours(hour, minute, 0, 0);
        const end = new Date(start.getTime() + svc.duration * 60_000);

        let status: AppointmentStatus;
        if (dayOffset < 0) {
          const r = Math.random();
          status =
            r < 0.88 ? AppointmentStatus.completed
            : r < 0.94 ? AppointmentStatus.cancelled
            : AppointmentStatus.no_show;
        } else if (dayOffset === 0) {
          status =
            hour < nowHour
              ? AppointmentStatus.completed
              : Math.random() < 0.6
              ? AppointmentStatus.confirmed
              : AppointmentStatus.scheduled;
        } else {
          status = Math.random() < 0.4 ? AppointmentStatus.confirmed : AppointmentStatus.scheduled;
        }

        apptRows.push({
          tenantId: tenant.id,
          locationId: officeId,
          clientId: client.id,
          staffId,
          serviceId: svc.id,
          startTime: start,
          endTime: end,
          status,
        });
        placed = true;
      }
    }
  }

  await prisma.appointment.createMany({ data: apptRows });

  // Backfill totalVisits + lastVisitAt from completed appointments so the
  // clients page reflects real history instead of all-zero counters.
  for (const c of clients) {
    const completed = await prisma.appointment.findMany({
      where: { clientId: c.id, status: AppointmentStatus.completed },
      select: { startTime: true },
      orderBy: { startTime: 'desc' },
    });
    if (completed.length > 0) {
      await prisma.client.update({
        where: { id: c.id },
        data: { totalVisits: completed.length, lastVisitAt: completed[0].startTime },
      });
    }
  }

  console.log('Done.');
  console.log('   Login: owner@delegendsbarbershop.lt / password');
  console.log(`   Tenant:    ${tenant.id}`);
  console.log(`   Office A:  ${officeA.id}  Senamiestis · Pilies g. 38`);
  console.log(`   Office B:  ${officeB.id}  Naujamiestis · Gedimino pr. 45`);
  console.log(`   Staff: ${staff.length} barbers — ${staff.map((s) => s.firstName).join(', ')}`);
  console.log(`   Services: ${services.length} (${CATALOG.length} per office × 2 offices)`);
  const fCount = clients.filter((c) => c.gender === Gender.female).length;
  const mCount = clients.filter((c) => c.gender === Gender.male).length;
  console.log(`   Appointments: ${apptRows.length} across 195 days (-180..+14)`);
  console.log(`   Clients: ${clients.length} (${fCount} F · ${mCount} M)`);
  console.log(`   Photos: staff ${Object.keys(STAFF_AVATARS).length} · clients ${CLIENT_AVATARS_MALE.length + CLIENT_AVATARS_FEMALE.length} (M+F pools) · service categories ${Object.keys(SERVICE_IMAGES_BY_CATEGORY).length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
