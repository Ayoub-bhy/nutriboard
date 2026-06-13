# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Run as non-root for safety.
RUN addgroup -S app && adduser -S app -G app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
USER app
EXPOSE 4000
# Apply migrations then boot. (Requires committed prisma/migrations — see CONTRIBUTING.)
CMD ["sh","-c","npx prisma migrate deploy && node dist/index.js"]
