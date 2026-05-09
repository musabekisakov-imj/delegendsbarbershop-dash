# Barber-Dash

Платформа для барбершопов: дашборд для персонала + публичный сайт для клиентов. Multi-tenant SaaS (планируется на бэкенде, на фронте — пока один tenant).

## Структура

Не настоящий monorepo — два отдельных приложения в одной репе, без `pnpm-workspace.yaml`.

```
src/                      # Dashboard (Vite + React)
  app/
    App.tsx
    routes.tsx
    pages/                # calendar, bookings, clients, staff, services,
                          # accounts, analytics, settings, overview, login,
                          # profile, help, new-booking
    components/
      ui/                 # shadcn-style primitives поверх Radix
      layout/             # Sidebar, Topbar, mobile-nav, etc.
      calendar/           # week-view, day-agenda, mini-calendar
      shared/             # PageHeader, StatCard
    hooks/                # use-t (i18n), use-confirm
    i18n/                 # en.ts, ru.ts, lt.ts + index.ts (самописная)
    lib/                  # api.ts (mock), tokens.ts, booking-validation,
                          # mock-data, time, calendar-lanes, cn
    store/                # Zustand: auth-store, language-store, office-store
    types/                # общие TS типы (Appointment, Break, Client, ...)
  styles/                 # theme.css (CSS-vars, light + dark)
  test/                   # Vitest setup
  main.tsx

customer-site/            # Публичный сайт (Next.js 14)
  app/                    # App Router
  components/
  i18n/
  lib/
  e2e/                    # Playwright

docs/
  reference/              # Скриншоты клиента + SPEC.md
  decisions/              # Архитектурные решения (ADR)
  features/               # Спецификации фич перед реализацией
  client-feedback/        # Записи общения с клиентом
public/                   # Статика для Vite
guidelines/               # Старые гайдлайны от заказчика
design-research/          # Дизайн-референсы
```

## Стек

### Dashboard (`src/`)
- **Vite 6** + **React 18** + **TypeScript** (strict)
- **react-router 7** (НЕ Next.js)
- **Tailwind 4** через `@tailwindcss/vite`
- **Radix UI primitives** + shadcn-style обёртки в `src/app/components/ui/`
- **heroicons** (`@heroicons/react/24/outline`) — единственная разрешённая библиотека иконок
- **motion** (`motion/react`, бывший framer-motion) для всех анимаций
- **react-hook-form** + **zod** для форм
- **Zustand** для глобального state (auth, prefs, office)
- **@tanstack/react-query** для server state
- **react-dnd** для drag-and-drop в календаре
- **date-fns** + локали (en, ru, lt)
- **Vitest** + Testing Library для тестов

### customer-site (`customer-site/`)
- **Next.js 14** App Router
- **Tailwind 3** (старая версия — отдельный конфиг)
- **framer-motion 11**, **heroicons**
- **Sentry** для production-мониторинга
- **Playwright** для E2E

### Backend
- **Сейчас отсутствует.** Mock-данные через `localStorage` в `src/app/lib/api.ts`. Schema-version migrations (текущая v11) — тоже mock.
- **Планируется**: NestJS + Drizzle ORM + PostgreSQL. Multi-tenancy через `tenant_id` на каждой таблице.

### Package manager
- **npm** (есть `package-lock.json`, не `pnpm-lock.yaml`).
- Поле `pnpm.overrides` в `package.json` — только pin для Vite, реально pnpm не используется.

## Главные правила

- **i18n: никакого хардкода UI-текста.** Все строки через `t('...')` из `useT()`. Переводы в `src/app/i18n/{en,ru,lt}.ts` — добавлять ключ во все три файла одновременно.
- **Multi-tenancy** (когда появится бэкенд): каждый запрос фильтруется по `tenant_id`. Без исключений. На фронте сейчас один tenant — пометки `tenantId: 'tenant-1'` уже разбросаны в коде.
- **Перед UI задачей**: читай `docs/reference/SPEC.md` и смотри скриншот в `docs/reference/screenshots/`. Если страница не описана в SPEC — спроси перед тем как кодить.
- **Перед изменениями в >3 файлах**: сначала план (что и зачем), потом код.
- **Иконки**: только `@heroicons/react`. Не добавлять lucide-react / react-icons / feather-icons.
- **Цвета**: только токены из `src/styles/theme.css` + Tailwind utilities. Не хардкодить hex.
- **Schema migrations**: каждый bump (v8→v9→...) добавлять в `src/app/lib/mock-data.ts` с idempotent backfill. Тип `Appointment | Break | Absence` обновлять в `src/app/types/index.ts` синхронно.

## Что уже сделано

- Dashboard полностью на UI-уровне: 13 страниц, multi-language (en/ru/lt), light + dark тема, comfort density preference, schema v11 с audit-trail (`createdBy`, `createdAt`).
- Calendar: drag-and-drop reschedule (optimistic + undo), 3 view modes (Day/Week/Grid), focus mode, multi-service bookings, recurring appointments, BlockDialog с recurrence (Never/Weekly/Ranged), break rendering с semantic palette, hover-cards с creator + audit, FAB.
- 46 unit тестов (Vitest). E2E нет.
- Customer-site базовый, требует дальнейшей работы.

## Что НЕ сделано (важно)

- **Бэкенда нет.** `src/app/lib/api.ts` на 100% mock через localStorage.
- **Auth — placeholder.** `authApi.login` в `src/app/lib/api.ts:115` принимает любой пароль.
- **E2E тестов нет.**
- **Перевод страниц на финальный стек дизайна** идёт по очереди — calendar готов, остальные требуют такого же уровня полировки.

## Документация и решения

- `docs/reference/SPEC.md` — разбор скриншотов клиента
- `docs/decisions/` — архитектурные решения (ADR формат), шаблон: `_template.md`
- `docs/features/` — спецификации фич перед реализацией, шаблон: `_template.md`
- `docs/client-feedback/` — записи общения с клиентом, шаблон: `_template.md`

Перед крупными решениями — записывай в `docs/decisions/`.
Перед крупной фичей — спецификация в `docs/features/`.

## Стиль ответов

- По-русски, если я пишу по-русски.
- Без преамбул ("Отличный вопрос!", "Конечно!").
- Если задача неоднозначна — спроси, не додумывай.
- Не рефакторь файлы которые не относятся к задаче.
- Короткие ответы; длинно — только если задача того стоит.
