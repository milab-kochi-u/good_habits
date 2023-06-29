FROM node:16.15.0-alpine
# Add Tini
RUN apk add --no-cache tini
# Tini is now available at /sbin/tini
ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /

RUN apk add sqlite sqlite-dev git make gcc libc-dev bash
RUN apk fix
RUN apk update
RUN apk upgrade

# テスト時にシステム時刻を固定化するためのlibfaketimeをインストール
RUN git clone https://github.com/wolfcw/libfaketime.git
WORKDIR /libfaketime/src
RUN make install

WORKDIR /app
COPY app/package*.json ./
RUN npm install -g express-generator
RUN npm install
USER node
