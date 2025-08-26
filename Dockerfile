# Full-stack Dockerfile for Fly.io deployment
FROM node:20-alpine AS builder

# Accept build arguments for frontend environment variables
ARG VITE_DYNAMIC_ENVIRONMENT_ID
ARG VITE_API_URL=https://vencura.fly.dev/api

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/
COPY packages/frontend/package*.json ./packages/frontend/

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment variables for Vite build
ENV VITE_DYNAMIC_ENVIRONMENT_ID=$VITE_DYNAMIC_ENVIRONMENT_ID
ENV VITE_API_URL=$VITE_API_URL

# Create symlinks for shared module
RUN mkdir -p packages/backend/node_modules/@vencura && \
    ln -sf ../../../shared packages/backend/node_modules/@vencura/shared && \
    mkdir -p packages/frontend/node_modules/@vencura && \
    ln -sf ../../../shared packages/frontend/node_modules/@vencura/shared

# Build everything - if dist folders exist, they'll be used, otherwise build fresh
RUN if [ ! -d "packages/shared/dist" ]; then cd packages/shared && npx tsc && cd ../..; fi && \
    if [ ! -d "packages/backend/dist" ]; then cd packages/backend && npx tsc --skipLibCheck && cd ../..; fi && \
    cd packages/frontend && npx vite build && cd ../..

# Production stage
FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/backend/package*.json ./packages/backend/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built backend and shared (ensure all files are copied)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/src ./packages/backend/src

# Copy built frontend
COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist

# Copy necessary config files  
COPY --from=builder /app/packages/backend/tsconfig.json ./packages/backend/

# Ensure shared module is accessible
RUN mkdir -p node_modules/@vencura && \
    ln -s ../../packages/shared node_modules/@vencura/shared

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "packages/backend/dist/index.js"]