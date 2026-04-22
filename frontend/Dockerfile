FROM node:20-alpine
WORKDIR /app

COPY package.json ./
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry "$NPM_REGISTRY" && npm install --no-audit --no-fund

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
