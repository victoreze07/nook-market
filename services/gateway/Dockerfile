FROM node:22-alpine
WORKDIR /app
COPY package.json index.mjs ./
ENV NODE_ENV=production
EXPOSE 8080
USER node
CMD ["node", "index.mjs"]
