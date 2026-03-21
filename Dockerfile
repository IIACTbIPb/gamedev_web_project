# ==========================================
# ЭТАП 1: Builder (Сборка проекта)
# ==========================================
FROM node:22-alpine AS builder

# Создаем папку внутри контейнера
WORKDIR /app

# Копируем главные конфиги монорепозитория
COPY package*.json ./
COPY turbo.json ./

# Копируем package.json сервера и shared (чтобы npm install понял структуру)
COPY apps/server/package*.json ./apps/server/
COPY packages/shared/package*.json ./packages/shared/

# Устанавливаем ВСЕ зависимости (включая devDependencies для компилятора tsc)
RUN npm install

# Теперь копируем сами исходники (клиент мы исключили в .dockerignore)
COPY apps/server ./apps/server
COPY packages/shared ./packages/shared

# МАГИЯ TURBO: Собираем сервер. 
# Флаг ... означает "собери сервер и все пакеты, от которых он зависит" (т.е. shared)
RUN npx turbo run build --filter=server...

# ==========================================
# ЭТАП 2: Runner (Легкий продакшен-образ)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Копируем только необходимые файлы из первого этапа
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Копируем скомпилированный shared
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Копируем скомпилированный сервер
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Открываем порт, на котором работает NestJS (судя по логам, это 3001)
EXPOSE 3001

# Указываем команду запуска скомпилированного main.js
CMD ["node", "apps/server/dist/main.js"]