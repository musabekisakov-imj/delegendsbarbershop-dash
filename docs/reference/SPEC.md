# Reference Spec

Здесь — разбор референсного продукта и скриншотов от клиента. Источник истины для всех UI задач.

Когда делаешь страницу — читай соответствующую секцию + смотри скриншот в `./screenshots/`. Если секция помечена `TODO` — спроси у клиента, не додумывай layout.

## Имена скриншотов

`{app}-{page}-{state}.png` — например:
- `dashboard-calendar-grid.png`
- `dashboard-calendar-week.png`
- `dashboard-bookings-empty.png`
- `website-home-mobile.png`
- `website-booking-step-2.png`

Скриншоты лежат в `./screenshots/`.

---

## Шаблон секции (копируй для каждой страницы)

### {Page Name}

**App**: `dashboard` | `website`
**Route**: `/...`
**Screenshot**: `./screenshots/...`
**Role**: `owner` | `manager` | `barber` | `receptionist` | `public`

#### Назначение
1–2 предложения: что юзер делает на этой странице, какую задачу закрывает.

#### Layout
- Header: что на нём (eyebrow, title, primary CTA)
- Sidebar: пункты (если есть)
- Main content: блоки сверху вниз

#### Компоненты
- **ComponentName** — что показывает, какие данные тянет, какая интерактивность
- **AnotherComponent** — ...

#### Данные
- `GET /api/...` — для блока X (когда появится бэкенд)
- Сейчас: `lib/api.ts → fooApi.getAll()` (mock)

#### Состояния
- **Loading**: skeleton (см. `CalendarGridSkeleton` как референс)
- **Empty**: что показывать, какой CTA
- **Error**: как показывать (toast vs inline)

#### Открытые вопросы
- ❓ Конкретный вопрос к клиенту

---

## Dashboard pages

### Overview

**App**: `dashboard`
**Route**: `/`
**Screenshot**: `./screenshots/dashboard-overview-default.png`
**Role**: `owner` | `manager`

TODO — описать после получения скриншота.

---

### Calendar

**App**: `dashboard`
**Route**: `/calendar`
**Screenshot**: `./screenshots/dashboard-calendar-grid.png`
**Role**: `owner` | `manager` | `receptionist` | `barber`

#### Назначение
Главная рабочая поверхность ресепшена и владельца: визуально планировать и редактировать бронирования через drag-and-drop, видеть смены/перерывы/отсутствия, управлять конфликтами.

#### Layout
- **Editorial hero**: eyebrow `Calendar · Office · Today` + display-size заголовок (день недели, дата) + кнопка `New appointment`.
- **Operator bar**: month/day chevrons → 7-day rail → staff filter → grid-density toggle (когда staff > 4) → view toggle (Day / Week / Grid).
- **Left sidebar** (lg+): MiniCalendar + Day Summary (sparkline + stat pair + staff roll).
- **Main**: DayAgenda / WeekView / Grid в зависимости от viewMode.
- **FAB**: floating "+" внизу справа.

#### Компоненты
- **WeekView** (`components/calendar/week-view.tsx`) — 7 колонок дней + sticky time-gutter + tile/break rendering.
- **DayAgenda** (`components/calendar/day-agenda.tsx`) — vertical agenda grouping by time.
- **renderBlock** (внутри `pages/calendar.tsx`) — booking tile с density ladder (tiny/compact/full/huge) + status pill + notes preview.
- **renderBreaks** — break/lunch tiles с semantic palette (lunch=amber, dinner=indigo, rest=emerald, custom=fuchsia).
- **AppointmentDetailModal** — full edit + audit footer.
- **BlockDialog** — create/edit break/absence с recurrence (never/weekly/ranged).
- **TimePickerField** — editorial picker с 5-chip shortcut bar + AM/PM segmented control.
- **ServicePickerSheet** — full-modal browse + search для multi-service.

#### Данные
Сейчас mock через `lib/api.ts`:
- `appointmentsApi.getAllWithDetails(officeId)`
- `clientsApi.getAll(officeId)`
- `staffApi.getAll(officeId)` + `shiftsApi.getAll()`
- `breaksApi.getAll()` + `absencesApi.getAll()` + `shiftOverridesApi.getAll()`
- `accountsApi.getAll()` (для creator-name lookup)

#### Состояния
- **Loading**: `CalendarGridSkeleton` + `SummarySkeleton`.
- **Empty (no staff)**: editorial empty-state.
- **Conflict**: модалка `conflictState` со списком пересечений + override action для owner/manager.

#### Открытые вопросы
- ❓ Sticky section eyebrows в booking modal — нужны или хватает существующего scroll?
- ❓ Поведение календаря на 12+ барберах: compact (110px) хватает или нужен ещё более узкий режим (~85px)?

---

### Bookings (table)

**App**: `dashboard`
**Route**: `/bookings`
**Screenshot**: `./screenshots/dashboard-bookings-default.png`
**Role**: `owner` | `manager` | `receptionist`

TODO — описать после получения скриншота.

---

### New booking (wizard)

**App**: `dashboard`
**Route**: `/bookings/new`
**Screenshot**: `./screenshots/dashboard-new-booking.png`
**Role**: `owner` | `manager` | `receptionist`

TODO — описать после получения скриншота.

---

### Clients

**App**: `dashboard`
**Route**: `/clients`
**Screenshot**: `./screenshots/dashboard-clients-default.png`
**Role**: `owner` | `manager` | `receptionist`

TODO — описать после получения скриншота.

---

### Staff

**App**: `dashboard`
**Route**: `/staff`
**Screenshot**: `./screenshots/dashboard-staff-default.png`
**Role**: `owner` | `manager`

TODO — описать после получения скриншота.

---

### Services

**App**: `dashboard`
**Route**: `/services`
**Screenshot**: `./screenshots/dashboard-services-default.png`
**Role**: `owner` | `manager`

TODO — описать после получения скриншота.

---

### Accounts (team & access)

**App**: `dashboard`
**Route**: `/accounts`
**Screenshot**: `./screenshots/dashboard-accounts-tree.png`
**Role**: `owner`

TODO — описать после получения скриншота.

---

### Analytics

**App**: `dashboard`
**Route**: `/analytics`
**Screenshot**: `./screenshots/dashboard-analytics-default.png`
**Role**: `owner` | `manager`

TODO — описать после получения скриншота.

---

### Settings

**App**: `dashboard`
**Route**: `/settings`
**Screenshot**: `./screenshots/dashboard-settings-appearance.png`
**Role**: `owner` | `manager` | `receptionist` | `barber`

TODO — описать после получения скриншота.

---

### Profile (self-edit)

**App**: `dashboard`
**Route**: `/profile`
**Screenshot**: `./screenshots/dashboard-profile-default.png`
**Role**: any logged-in

TODO — описать после получения скриншота.

---

### Login

**App**: `dashboard`
**Route**: `/login`
**Screenshot**: `./screenshots/dashboard-login.png`
**Role**: `public`

TODO — описать после получения скриншота.

---

### Help

**App**: `dashboard`
**Route**: `/help`
**Screenshot**: `./screenshots/dashboard-help.png`
**Role**: any logged-in

TODO — описать после получения скриншота.

---

## Customer-site pages

### Public Home

**App**: `website`
**Route**: `/`
**Screenshot**: `./screenshots/website-home-default.png`
**Role**: `public`

TODO — описать после получения скриншота.

---

### Booking Flow

**App**: `website`
**Route**: `/book` (или multi-step)
**Screenshot**: `./screenshots/website-booking-step-1.png`
**Role**: `public`

TODO — описать после получения скриншота.

---

### Service catalog

**App**: `website`
**Route**: `/services`
**Screenshot**: `./screenshots/website-services.png`
**Role**: `public`

TODO — описать после получения скриншота.

---

### Staff list

**App**: `website`
**Route**: `/staff`
**Screenshot**: `./screenshots/website-staff.png`
**Role**: `public`

TODO — описать после получения скриншота.

---

## Cross-cutting topics

### i18n
- Все локали в `src/app/i18n/{en,ru,lt}.ts`.
- Новый ключ → добавить во все три файла одновременно. TS-проверка не пропустит частичные локали.
- Plurals: `pluralKey(lang, n)` в `src/app/i18n/index.ts` — для RU/LT с `One/Few/Many` суффиксами.
- Customer-site i18n: отдельная (Next.js), в `customer-site/i18n/`.

### Themes
- Light + Dark (Navy удалили). Токены в `src/styles/theme.css`.
- `next-themes` через `ThemeProvider attribute="class" themes={['light', 'dark']}`.

### Roles
- `owner` (full) → `manager` (operate, no settings) → `receptionist` (book/edit) → `barber` (read own day).
- `canOverride = role in [owner, manager]`. Override-only действия: drag-to-reschedule, conflict override, BlockDialog admin types (day-off / vacation / sick / training).

### Schema versioning (mock data)
- `src/app/lib/mock-data.ts` → `CURRENT_SCHEMA_VERSION` (сейчас v11).
- Каждый bump: idempotent backfill, не теряем поля. Migration runs in `main.tsx` через `initializeMockData()`.
- При появлении REMOTE backend (`VITE_API_URL`) — миграция no-op, server владеет схемой.

### Audit trail
- `Appointment.createdBy` + `createdAt`, `Break.createdBy` + `createdAt`, `Absence.createdBy` + `createdAt`.
- Display: `formatCreator(createdBy)` resolves через `accountById` Map (page-level memo).
- Surface points: hover-card footer (booking + break) + AppointmentDetailModal footer.
