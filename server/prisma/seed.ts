import { PrismaClient, StaffRole, AppointmentStatus, DayOfWeek, BreakType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

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
      name: 'Kirpykla Vilnius',
      email: 'hello@kirpykla.lt',
      phone: '+370 600 00000',
      language: 'lt',
      theme: 'light',
      workingHours: WORKING_HOURS,
    },
  });

  const officeA = await prisma.office.create({
    data: { tenantId: tenant.id, name: 'Senamiestis', address: 'Pilies g. 12, Vilnius', phone: '+370 600 00001', timezone: 'Europe/Vilnius' },
  });
  const officeB = await prisma.office.create({
    data: { tenantId: tenant.id, name: 'Naujamiestis', address: 'Gedimino pr. 45, Vilnius', phone: '+370 600 00002', timezone: 'Europe/Vilnius' },
  });

  // Owner account (login: owner@kirpykla.lt / password)
  const passwordHash = await argon2.hash('password');

  const ownerStaff = await prisma.staff.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Aurimas',
      lastName: 'Petrauskas',
      email: 'owner@kirpykla.lt',
      phone: '+370 600 11111',
      role: StaffRole.owner,
      isActive: true,
      officeLinks: { create: [{ officeId: officeA.id }, { officeId: officeB.id }] },
    },
  });

  await prisma.account.create({
    data: {
      tenantId: tenant.id,
      email: 'owner@kirpykla.lt',
      passwordHash,
      firstName: 'Aurimas',
      lastName: 'Petrauskas',
      role: StaffRole.owner,
      staffId: ownerStaff.id,
      officeLinks: { create: [{ officeId: officeA.id }, { officeId: officeB.id }] },
    },
  });

  // Three more barbers
  const staffSeed = [
    { firstName: 'Lukas',    lastName: 'Kazlauskas', email: 'lukas@kirpykla.lt',    phone: '+370 600 22222', offices: [officeA.id] },
    { firstName: 'Sarunas',  lastName: 'Jankauskas', email: 'sarunas@kirpykla.lt',  phone: '+370 600 33333', offices: [officeB.id] },
    { firstName: 'Tomas',    lastName: 'Stankevicius', email: 'tomas@kirpykla.lt',  phone: '+370 600 44444', offices: [officeA.id, officeB.id] },
  ];
  const staff = [ownerStaff];
  for (const s of staffSeed) {
    const created = await prisma.staff.create({
      data: {
        tenantId: tenant.id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        role: StaffRole.barber,
        isActive: true,
        officeLinks: { create: s.offices.map(officeId => ({ officeId })) },
      },
    });
    staff.push(created);
  }

  // Default Mon-Sat shifts + lunch break for every staff member
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

  // Categories + services
  const cuts = await prisma.category.create({ data: { tenantId: tenant.id, name: 'Kirpimai' } });
  const beard = await prisma.category.create({ data: { tenantId: tenant.id, name: 'Barzdos' } });
  const combos = await prisma.category.create({ data: { tenantId: tenant.id, name: 'Kombinacijos' } });

  const services = await Promise.all([
    prisma.service.create({ data: { tenantId: tenant.id, officeId: officeA.id, categoryId: cuts.id,   name: 'Vyriškas kirpimas', price: 25, duration: 45, description: 'Klasikinis arba modernus' } }),
    prisma.service.create({ data: { tenantId: tenant.id, officeId: officeA.id, categoryId: beard.id,  name: 'Barzdos formavimas', price: 18, duration: 30, description: '' } }),
    prisma.service.create({ data: { tenantId: tenant.id, officeId: officeA.id, categoryId: combos.id, name: 'Kirpimas + barzda', price: 38, duration: 70, description: 'Kombinuota paslauga' } }),
    prisma.service.create({ data: { tenantId: tenant.id, officeId: officeB.id, categoryId: cuts.id,   name: 'Vyriškas kirpimas', price: 25, duration: 45, description: '' } }),
    prisma.service.create({ data: { tenantId: tenant.id, officeId: officeB.id, categoryId: beard.id,  name: 'Skutimas peiliu',    price: 22, duration: 35, description: 'Karštas rankšluostis' } }),
  ]);

  // A handful of clients (no PII — test data only)
  const clientNames = [
    ['Jonas', 'Ąžuolaitis'],
    ['Mantas', 'Bružas'],
    ['Edgaras', 'Čepulis'],
    ['Kęstutis', 'Daukša'],
    ['Domas', 'Eidukas'],
    ['Rokas', 'Gintautas'],
  ];
  const clients = await Promise.all(
    clientNames.map(([first, last], i) =>
      prisma.client.create({
        data: {
          tenantId: tenant.id,
          firstName: first,
          lastName: last,
          email: `${first.toLowerCase()}@example.lt`,
          phone: `+370 6${String(10000000 + i).slice(0, 8)}`,
          notes: '',
          officeLinks: { create: [{ officeId: i % 2 === 0 ? officeA.id : officeB.id }] },
        },
      }),
    ),
  );

  // Today's appointments — three for office A, two for office B
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const at = (h: number, m: number) => {
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d;
  };

  await prisma.appointment.createMany({
    data: [
      { tenantId: tenant.id, locationId: officeA.id, clientId: clients[0].id, staffId: staff[1].id, serviceId: services[0].id, startTime: at(10, 0),  endTime: at(10, 45), status: AppointmentStatus.confirmed },
      { tenantId: tenant.id, locationId: officeA.id, clientId: clients[2].id, staffId: staff[1].id, serviceId: services[2].id, startTime: at(11, 30), endTime: at(12, 40), status: AppointmentStatus.scheduled },
      { tenantId: tenant.id, locationId: officeA.id, clientId: clients[4].id, staffId: staff[3].id, serviceId: services[1].id, startTime: at(15, 0),  endTime: at(15, 30), status: AppointmentStatus.scheduled },
      { tenantId: tenant.id, locationId: officeB.id, clientId: clients[1].id, staffId: staff[2].id, serviceId: services[3].id, startTime: at(11, 0),  endTime: at(11, 45), status: AppointmentStatus.confirmed },
      { tenantId: tenant.id, locationId: officeB.id, clientId: clients[5].id, staffId: staff[2].id, serviceId: services[4].id, startTime: at(16, 30), endTime: at(17, 5),  status: AppointmentStatus.scheduled },
    ],
  });

  console.log('Done.');
  console.log('   Login: owner@kirpykla.lt / password');
  console.log(`   Tenant: ${tenant.id}`);
  console.log(`   Offices: ${officeA.id}, ${officeB.id}`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
