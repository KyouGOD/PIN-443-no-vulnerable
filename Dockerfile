FROM node:23-alpine AS builder

WORKDIR /app

# Add build argument for cache busting
ARG CACHE_BUST=unknown

# Update npm to the latest version
RUN npm install -g npm@latest

COPY package*.json ./

# Use npm install with force flag to ensure resolutions are applied
RUN npm install --force

COPY . .

# Log the cache bust value for debugging
RUN echo "Build with CACHE_BUST=${CACHE_BUST}"

RUN npm run build

FROM alpine

WORKDIR /app

COPY --from=builder /app/dist/pin-443-banking-less/browser /app
