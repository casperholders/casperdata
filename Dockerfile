FROM node:lts as build-stage
COPY package*.json ./
RUN yarn install
COPY ./ .
RUN yarn build

FROM debian:stable-slim as production-stage
COPY --from=build-stage /bin/casperdata .
CMD ["./casperdata"]
