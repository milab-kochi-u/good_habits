FROM node:16.15.0-alpine
WORKDIR /app
RUN apk fix
RUN apk update
RUN apk upgrade
RUN apk add sqlite sqlite-dev
RUN npm install -g sequelize sqlite3 express-generator npm@8.10.0 