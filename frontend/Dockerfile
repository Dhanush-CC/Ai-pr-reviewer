# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Provide placeholder variables to pass Next.js build-time static analysis
RUN MONGODB_URI="mongodb://placeholder" NEXTAUTH_SECRET="placeholder" npm run build

EXPOSE 3000

CMD ["npm", "start"]