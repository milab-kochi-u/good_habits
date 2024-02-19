# good_habits
(最終編集日: 2023.12.16 Jotaro Nakamura)  
本プロジェクトは三好研究室の習慣化支援に関する研究の一つである  
**「習慣化支援システムにおける推薦機能及びシミュレーションシステムの実装」**
に関するプロジェクトです。  

本プロジェクトは以下の機能を持っています。

- シミュレーション機能 (`/app`)
- Webビューア (`/app`)
- 推薦機能 (`/pyapp`)

上記機能はすべてDockerコンテナで正常に起動しますが、
ネイティブ環境での起動確認はしていません(途中で諦めた...)。
そのため、なるべくDockerで起動するようにして下さい。  
(推薦機能はDocker環境のみで作成したので特に注意)

##  シミュレーション機能 & Webビューア
ソースコードは`/app`以下です。利用した技術は以下です。

```
Language     : Node.js (v16.15)
WebFrameWork : Express
WebUI        : EJS + Tailwind CSS
DB           : sqlite3
ORM          : Sequelize
```

### シミュレーション機能

推薦機能を実装するためにはユーザが習慣化支援アプリを用いて活動したデータが必要です。そのため、シミュレーション機能を用いてダミーのユーザの利用履歴データを生成し、習慣化する様子をシミュレートします。本機能は主に以下のファイルで構成されています。

- `app/generate_dummydata.js` : ダミーデータを生成しJSONファイルに出力
- `app/import_dummydata.js` : ダミーデータJSONファイルをDBに書き込み
- `app/simulate.js` : ダミーデータを利用してシミュレーションを実行する
- `app/start.sh` : 上記jsの制御用スクリプト，シミュレーションを実施する場合は基本的にこれを実行

**docker composeで起動する場合(推奨)**
- x86_64  
```bash
$ docker compose exec app bash // コンテナの中のbashを実行
$ ./start.sh --help
```
- arm64  
```bash
$ docker compose -f docker-compose_arm64.yml exec app bash
$ ./start.sh --help
```

```
ヘルプ）こんにちは
本スクリプトは三好研究室の「習慣化支援システム」のシミュレーションプログラムです．
本コマンドにより
・ダミーデータの生成(default: 実施しない)
・express(DB)にダミーデータの読込(default: 実施しない)
・シミュレーションの実施(default: 実施する)
が実行できます．
オプション省略時のコマンド引数: start.sh -i 2020-01-01 -D 10
使い方：
-h or --help：
    当プログラムの説明を表示します．
-i or --init [YYYY-MM-DD]：
    日付形式を指定し，その日付からシミュレーションを開始します．
-D or --Day [integer]:
    シミュレーションの期間を設定します．
-u or --users [integer]:
    ダミーデータ生成時のユーザ数を指定します．
--no-sim:
    シミュレーションを実行しません．
--no-init:
    シミュレーション時にinitオプションを使用しません(前回のデータを継続します)
    '--reload-db'オプションを使わないでください．
--do-recommend:
    シミュレーション時に推薦を実施します
--data-gen:
    ダミーデータを再作成します．
--reload-db:
    ./dummydata.json に記載の内容を./db-dev.sqlite3 に読み込みます．(DB既存データは削除され ます)
--backup [fileName]:
    ※ このオプションは他のオプションより優先して実行されます．
    コマンド実行時点でのdummydata.jsonとdb-dev.sqlite3のコピーファイルを以下のように保存します．
    ./backups/fileName.json, ./backups/fileName.sqlite3
    拡張子は記述しないでください．
--replace [fileName]:
    ※ このオプションを使用した場合ダミーデータの生成とシミュレーションは実施されません．
    引数に入力したファイル名に該当する
    fileName.json, fileName.sqlite3ファイルを
    ./dummydata.json, ./db-dev.sqlite3　に上書きします．
    拡張子は記述しないでください．
```

時刻は[Libfaketime](https://github.com/wolfcw/libfaketime)を使用して偽装しています。  
※version ≦ v0.1 では下記Webビューアが立ち上がった状態でないとstart.shを実行できません。
### Webビューア

利用履歴データはDBに保存していき、Webビューア機能でグラフ表示できるようにしています。
Dockerの場合下記コンテナ起動後 `localhost:3000` にアクセスすると表示されます。

**docker composeで起動する場合(推奨)**
- x86_64  
`$ docker compose up`
- arm64  
`$ docker compose -f docker-compose_arm64.yml up`  

**docker未使用(非推奨)**
```bash
$ cd ./app
$ npm run start-dev
```
##  推薦機能
ソースコードは`/pyapp`以下です。利用した技術は以下です。

```
Language               : python3.9
APIFrameWork           : FaktAPI
Recommendation process : Numpy, Pandas
```

sqlite3ファイルと推薦を受け取りたいユーザ，ワークを指定するとおすすめの工夫を返すWebAPIとして機能します。
シミュレーション機能 & Webビューア立ち上げ時の `docker compose up` 実行時に既に組み込まれています。  

コンテナ間通信で `app/simulation/simulate.js` とやり取りしますが，ローカルで試したい場合は `localhost:8888` にアクセスすると応答します。

例：
```bash
curl --location 'localhost:8888/recommend/users/34/works/1?model=cf_mem_user' \
--form 'input_file=@"/path/to/file"'
```