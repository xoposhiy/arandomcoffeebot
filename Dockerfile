FROM node:alpine AS build
WORKDIR /app
RUN apk add python make gcc g++
COPY ./package.json .

RUN yarn install 
COPY ./tsconfig.json ./
COPY ./babel.config.js ./



COPY ./bot.ts ./
COPY ./src src/

ENTRYPOINT ["./node_modules/.bin/babel-node", "-x", ".ts", "bot.ts"]