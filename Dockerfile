FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=${VITE_API_URL}

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
