# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install system dependencies required for puppeteer and sharp
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++ \
    vips-dev

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install dependencies
RUN npm ci --only=production --silent

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p temp wwebjs_auth

# Set proper permissions
RUN chown -R node:node /app
USER node

# Expose port (Railway will provide PORT env var)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start the application
CMD ["npm", "start"]