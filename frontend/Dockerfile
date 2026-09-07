# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Build the Next.js production payload
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]