# University Digital Schedule — Web (Next.js)
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

EXPOSE 3000

# Dev-friendly default for docker-compose volume mount workflow
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]
