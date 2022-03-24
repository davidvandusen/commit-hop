FROM node:16.13-alpine
WORKDIR /app/
RUN npm install y-websocket@^1.4.0
ENV PORT=1234
CMD node ./node_modules/y-websocket/bin/server.js
