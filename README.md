# Push Me — Telegram Mini App для тренировок

MVP Telegram WebApp для логирования тренировок в зале с быстрым вводом подходов, автосохранением, оффлайн-очередью, историей, аналитикой и недельным лидербордом внутри группы.

## Стек

- Frontend: React + TypeScript + Vite + TailwindCSS + Recharts
- Backend: Node.js + Express + Prisma + Zod + JWT
- DB: PostgreSQL (подходит для Supabase)
- Auth: Telegram WebApp initData verification на backend
- Bot: Telegraf (/start + кнопка открытия WebApp)

## Структура репозитория

- `backend` — REST API, Prisma schema/migrations/seed, unit tests
- `frontend` — Telegram Mini App UI
- `bot` — Telegram бот для открытия WebApp
- `docker-compose.yml` — локальный запуск `db + backend + frontend`

## Реализованный функционал MVP

### Тренировки

- Быстрый выбор тренировки: `Понедельник / Вторник / Четверг / Своя`
- Предзаполненные шаблоны (Пн/Вт/Чт) через seed
- Карточки упражнений с раскрытием подходов
- Ввод подхода: `вес (decimal) + повторы`
- По умолчанию `4` подхода, есть `+/-` подходы
- Быстрые кнопки: `-2.5`, `+2.5`, `+5`, `-1R`, `+1R`
- `Скопировать прошлый раз` для упражнения
- Автосохранение при вводе
- Кнопка `Кардио` (маркер в `notes` без сетов)
- Завершение тренировки (`endedAt`)
- Добавление упражнения в текущую сессию
- Поиск/создание новых упражнений
- Редактирование шаблонов (enable/disable, порядок, добавление упражнения)

### Оффлайн-устойчивость

- При ошибках сети операции сохраняются в `localStorage` очередь
- Синхронизация очереди автоматически при `online`
- Локальный черновик сессии в `localStorage`

### История

- Экран `История` со списком тренировок
- Просмотр логов по упражнениям/подходам

### Лидерборд

- Создание группы, вступление по invite-коду
- Недельный лидерборд по ISO неделе (`YYYY-Www`)
- Метрика: `sum(weight * reps)`
- Показ: место, имя, объём, число тренировок

### Аналитика/Прогресс

- Экран `Прогресс` в нижней навигации
- График по упражнению с переключателями:
  - Метрика: `Макс вес / Объем / Средний вес`
  - Период: `1 месяц / 3 месяца / Все время`
  - Режим: `Реальный вес / Оценочный 1RM`
- 1RM считается по Эпли: `weight * (1 + reps / 30)`
- Карточка быстрой аналитики:
  - Последний результат
  - Разница с прошлой тренировкой
  - Лучший результат
  - Серия улучшений
- Личный прогресс недели:
  - Общий объем недели
  - Изменение к прошлой неделе (%)
  - Самое прогрессирующее упражнение

## Схема данных

Prisma-модели реализованы:

- `User`
- `WorkoutTemplate`
- `Exercise`
- `TemplateExercise`
- `WorkoutSession`
- `ExerciseLog`
- `SetLog`
- `Group`
- `GroupMember`

Файлы:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/0001_init/migration.sql`
- `backend/prisma/seed.ts`

## API

Базовый префикс: `/api`

- `POST /auth/telegram`
- `POST /auth/dev` (только dev)
- `GET /me`
- `GET /templates`
- `POST /sessions`
- `GET /sessions?from=&to=`
- `GET /sessions/:id`
- `PATCH /sessions/:id`
- `POST /sessions/:id/exercises/:exerciseId`
- `POST /sessions/:id/exercises/:exerciseId/copy-last`
- `POST /setlogs` (upsert)
- `DELETE /setlogs`
- `GET /exercises?q=`
- `POST /exercises`
- `PATCH /template-exercises/:id`
- `POST /template-exercises`
- `POST /groups`
- `POST /groups/join`
- `GET /groups/my`
- `GET /leaderboard?week=YYYY-Www&groupId=`
- `GET /analytics/exercise/:exerciseId?period=1m|3m|all&metric=max_weight|volume|avg_weight&mode=real|e1rm`
- `GET /analytics/exercise/:exerciseId/summary?...`
- `GET /analytics/weekly-progress`

## Локальный запуск (без Docker)

### 1) Поднять PostgreSQL или Supabase

Вариант Supabase:

1. Создай проект в Supabase
2. Возьми connection string Postgres
3. Пропиши в `backend/.env` `DATABASE_URL=...`

Вариант локальный Postgres:

- `postgresql://postgres:postgres@localhost:5432/pushme`

### 2) Настроить backend

```bash
cd backend
cp .env.example .env
# заполни TELEGRAM_BOT_TOKEN и JWT_SECRET
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

### 3) Настроить frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 4) Настроить bot

```bash
cd bot
cp .env.example .env
# BOT_TOKEN и WEB_APP_URL
npm install
npm run dev
```

## Docker Compose

```bash
docker compose up --build
```

Сервисы:

- frontend: `http://localhost:5173`
- backend: `http://localhost:4000`
- postgres: `localhost:5432`

Важно: для Docker backend нужно передать `TELEGRAM_BOT_TOKEN` (через переменные окружения shell).

## Настройка Telegram Bot + WebApp

1. Создай бота через [@BotFather](https://t.me/BotFather)
2. Получи токен, установи `BOT_TOKEN` и `TELEGRAM_BOT_TOKEN`
3. Разверни frontend на HTTPS-домене
4. В BotFather настрой домен WebApp (`/setdomain`)
5. Укажи `WEB_APP_URL=https://your-domain`
6. Запусти `bot`, в Telegram нажми `/start` -> кнопка `Открыть дневник`

## Безопасность

- Валидация `initData` Telegram на backend обязательна (`/auth/telegram`)
- Проверяется подпись HMAC и `auth_date` (TTL)
- После успешной проверки выдается JWT

## Тесты

Минимальные unit-тесты backend:

- `backend/tests/leaderboard.test.ts` — расчёт лидерборда
- `backend/tests/setlog.test.ts` — логика upsert подходов

Запуск:

```bash
cd backend
npm test
```

## Деплой (кратко)

- Backend: любой Node hosting (Railway/Render/Fly/VM)
- Frontend: Vercel/Netlify/Cloudflare Pages (обязательно HTTPS)
- DB: Supabase Postgres
- Bot: отдельный процесс (Long Polling) или webhook

## Ограничения текущего MVP

- В этой среде сборка/тесты не были выполнены, т.к. отсутствует установленный Node.js/npm.
- Для production рекомендуется добавить e2e тесты и rate limit на auth/group endpoints.
