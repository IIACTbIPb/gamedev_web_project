# 🎮 3D Multiplayer Web Game (Monorepo)

Это базовый шаблон для создания многопользовательской 3D-игры в браузере. Проект построен на современной масштабируемой архитектуре с использованием монорепозитория.

## 🛠 Стек технологий

- **Монорепозиторий:** Turborepo + pnpm
- **Клиент (Frontend):** React, Vite, Three.js, React Three Fiber (R3F), Rapier 3D (физика), ECS (miniplex)
- **Сервер (Backend):** NestJS, Socket.io (WebSockets)
- **Общее (Shared):** TypeScript для шаринга типов (GameState, PlayerState) между клиентом и сервером

## 📂 Структура проекта

- `apps/client` — Frontend-приложение (3D сцена и UI).
- `apps/server` — Backend-приложение (игровой сервер и синхронизация).
- `packages/shared` — Общие интерфейсы и константы.

## 🚀 Как запустить локально

### 1. Требования
- Node.js (v22.12+)
- pnpm (v9.6.0)

### 2. Установка

Клонируйте репозиторий и установите зависимости:
\`\`\`bash
git clone https://github.com/IIACTbIPb/gamedev_web_project.git
cd gamedev_web_project
pnpm install
\`\`\`

### 3. Настройка окружения

Создайте файл `.env` в папке `apps/client` и добавьте URL сервера:
\`\`\`env
VITE_SOCKET_URL=http://localhost:3001
\`\`\`

### 4. Запуск

Запустите клиент и сервер одновременно одной командой из корня проекта:
\`\`\`bash
pnpm dev
\`\`\`

- **Клиент:** http://localhost:5173
- **Сервер:** http://localhost:3001

> 💡 **Подсказка:** Откройте `http://localhost:5173` в нескольких вкладках браузера, чтобы проверить синхронизацию мультиплеера в реальном времени!