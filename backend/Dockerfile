FROM node:20-alpine
WORKDIR /app

COPY package.json ./
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry "$NPM_REGISTRY" && npm install --omit=dev --no-audit --no-fund

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
