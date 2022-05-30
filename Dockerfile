FROM node:16.15.0-alpine
# Add Tini
RUN apk add --no-cache tini
# Tini is now available at /sbin/tini
ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /app
RUN apk fix
RUN apk update
RUN apk upgrade
RUN apk add sqlite sqlite-dev
RUN npm install -g express-generator npm@8.10.0 