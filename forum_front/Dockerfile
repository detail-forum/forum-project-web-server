FROM node:22-bookworm AS build
WORKDIR /src
COPY package.json package-lock.json ./
# 커밋된 package-lock.json이 package.json과 어긋나 있어 npm ci 대신 install을 쓴다.
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY . .
# NEXT_PUBLIC_* 값은 빌드할 때 번들에 박힌다.
ARG NEXT_PUBLIC_API_URL=https://forum.rjsgud.com/api
ARG NEXT_PUBLIC_GIPHY_API_KEY=
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GIPHY_API_KEY=$NEXT_PUBLIC_GIPHY_API_KEY
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json next.config.js ./
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund
COPY --from=build /src/.next ./.next
COPY public ./public
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
