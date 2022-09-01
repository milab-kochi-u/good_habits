FROM node:16.15.0-alpine
# Add Tini
RUN apk add --no-cache tini
# Tini is now available at /sbin/tini
ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /

RUN apk fix
RUN apk update
RUN apk upgrade
RUN apk add sqlite sqlite-dev git make gcc libc-dev

# テスト時にシステム時刻を固定化するためのlibfaketimeをインストール
RUN git clone https://github.com/wolfcw/libfaketime.git
WORKDIR /libfaketime/src
RUN make install

WORKDIR /app
RUN npm install -g express-generator npm@8.10.0 
