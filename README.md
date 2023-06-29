# good_habits

## 1. Webサーバの起動
### with Docker
```bash
$ docker-compose up
```

### without Docker
```bash
$ cd ./app
$ npm run start-dev
```

## 2. シミュレートの実行
### with Docker
```bash
$ docker-compose exec app bash
$ ./start.sh (-h でヘルプ)
```

### without Docker
```bash
$ cd ./app
$ ./start.sh
```
