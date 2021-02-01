FROM node:14.15.4-alpine AS web-base
ENV PATH /usr/src/node_modules/.bin:$PATH
ENV NODE_PATH /usr/src/node_modules/:$NODE_PATH
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
COPY scripts ./scripts
RUN node scripts/rewrite-pkg-json.js
RUN rm -rf scripts
RUN yarn --pure-lockfile
COPY . .
RUN mv .env.docker .env

