# server/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose the Gateway port (the Worker ignores this)
EXPOSE 5500

# The default command (can be overridden by docker-compose)
CMD ["node", "index.js"]