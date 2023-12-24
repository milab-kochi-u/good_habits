#!/bin/bash

echo "PID=$$ PPID=$PPID"
if [ $$ -ne $(pgrep -fo "$0") ]; then
	echo "[ERROR]既に起動されています"
	exit 1
fi

help(){
	cat <<- EOS

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
	    ./dummydata.json に記載の内容を./db-dev.sqlite3 に読み込みます．(DB既存データは削除されます)
	--backup [fileName]:
	    ※ このオプションはダミーデータの生成やシミュレーションの後に実施されます.
	    dummydata.jsonとdb-dev.sqlite3のコピーファイルを以下のパスに保存します．
	    ./backups/fileName.json, ./backups/fileName.sqlite3
	    拡張子は記述しないでください．
	--replace [fileName]:
	    ※ このオプションを使用した場合ダミーデータの生成とシミュレーションは実施されません．
	    引数に入力したファイル名に該当する
	    fileName.json, fileName.sqlite3ファイルを
	    ./dummydata.json, ./db-dev.sqlite3　に上書きします．
	    拡張子は記述しないでください．
	EOS
	exit 0
}

date_validate(){
	# dateコマンドの引数の値が有効であれば0,そうでなければ1を返す
	#https://qiita.com/ma2shita/items/d322463352fa01d776c8
	res=0 # result value (0 is succeeded)
	date --date 2020-01-01 > /dev/null 2>&1 # inspect
	readonly _IS_DATECMD=$([ "$?" -eq 0 ] && echo "GNU" || echo "BSD") # judge (likes ternary operator)
	echo "[NOTICE] You are using ${_IS_DATECMD} cmd." >&2
	if [ "$_IS_DATECMD" = "GNU" ]; then
		# GNU date
		(date --date "$1") > /dev/null 2>&1 || res=1
	else
		# BSD date
		(date -j -f '%Y/%m/%d' "$1") > /dev/null 2>&1 || (date -j -f '%Y-%m-%d' "$1") > /dev/null 2>&1 || res=1
	fi
	return $res
}

dateinit(){
	SETDATE="$1"
}

# ダミーデータの生成
generate_dummydata(){
	node generate_dummydata.js ${ARGS_GENERATEDATA} > dummydata.json
}

# ダミーデータを読み込む
read_dummydata(){
	node import_dummydata.js dummydata.json
}

# シミュレーションの実行
exec_simulation(){
	# -- 過去のシミュレーション結果を削除し，2020年1月1日から指定日間のシミュレーションを行う
	if [ ${NO_INIT} = "YES" ];then
		node simulate.js -d "${SETDAYS}" ${DO_RECOMMEND}
	else
		node simulate.js --init "${SETDATE}" -d "${SETDAYS}" ${DO_RECOMMEND}
	fi
}

# バックアップファイルの生成
backup_files(){
	cp "./dummydata.json" "./backups/$1.json"
	cp "./db-dev.sqlite3" "./backups/$1.sqlite3"
}

# バックアップファイルの適用
replace_files(){
	if [ -f "./backups/$1.json" ] && [ -f "./backups/$1.sqlite3" ]; then
		cp "./backups/$1.json" "./dummydata.json"
		cp "./backups/$1.sqlite3" "./db-dev.sqlite3"
	else
		echo "[ERROR] $1.json または $1.sqlite3 が存在しません．"
		exit 1
	fi
}

# 2023.11.6閲覧 【最終完全版】 bash/zsh 用オプション解析テンプレート (getopts→shift) https://zenn.dev/takakiriy/articles/e65780261dd5e3
SETDATE="2020-01-01"
SETTIME="00:00:00"
SETDAYS="10"
ARGS_GENERATEDATA=""
FLAG_GENERATEDATA="NO"
NO_INIT="NO"
BACKUP="NO"
DO_RECOMMEND=""
FLAG_READDATA="NO"
FLAG_SIMULATE="YES"
while [[ $# -gt 0 ]]; do
	case $1 in
		# ---- param options ----
		-i|--init)
			if [[ -z $2 ]] ; then echo "[ERROR] $1 must have parameter." ; exit 1 ; fi
			case $2 in
				-*)
					echo "[ERROR] Invalid parameter." ; exit 1
					;;
				*) 
					if ! date_validate $2 ; then echo "[ERROR] $1 parameter must be in date format." ; exit 1 ; fi
					if [[ "$2" =~ ([a-zA-Z]+) ]]; then echo "[ERROR] $1 parameter must be in date format." ; exit 1 ; fi
					SETDATE=$2 ; shift ; shift
			esac
			;;
		-D|--Day)
			case $2 in
				-*)
					echo "[ERROR] Invalid parameter." ; exit 1
					;;
				*) 
					if [[ -z $2 ]] ; then echo "[ERROR] $1 must have parameter." ; exit 1 ; fi
					if [[ ! "$2" =~ (^[1-9][0-9]*) ]] || [[ "${BASH_REMATCH[0]}" != "$2" ]]; then echo "[ERROR] $1 parameter must be in non zero interger." ; exit 1 ; fi
					SETDAYS="$2" ; shift ; shift
			esac
			;;
		-u|--users)
			case $2 in
				-*)
					echo "[ERROR] Invalid parameter." ; exit 1
					;;
				*) 
					if [[ -z $2 ]] ; then echo "[ERROR] $1 must have parameter." ; exit 1 ; fi
					if [[ ! "$2" =~ (^[1-9][0-9]*) ]] || [[ "${BASH_REMATCH[0]}" != "$2" ]]; then echo "[ERROR] $1 parameter must be in non zero interger." ; exit 1 ; fi
					ARGS_GENERATEDATA+="-u $2 " ; shift ; shift
			esac
			;;
		--backup)
			case $2 in
				-*)
					echo "[ERROR] Invalid parameter." ; exit 1
					;;
				*) 
					if [[ -z $2 ]] ; then echo "[ERROR] $1 must have parameter." ; exit 1 ; fi
					BACKUP=$2 ; shift ; shift
			esac
			;;
		--replace)
			case $2 in
				-*)
					echo "[ERROR] Invalid parameter." ; exit 1
					;;
				*) 
					if [[ -z $2 ]] ; then echo "[ERROR] $1 must have parameter." ; exit 1 ; fi
					replace_files $2 ; exit 0
			esac
			;;

		# ---- flag options ----
		--no-sim)
			FLAG_SIMULATE="NO" ; shift
			;;
		--no-init)
			NO_INIT="YES" ; shift
			;;
		--do-recommend)
			DO_RECOMMEND="--doRecommend" ; shift
			;;
		--data-gen)
			FLAG_GENERATEDATA="YES" ; shift
			;;
		--reload-db)
			FLAG_READDATA="YES" ; shift
			;;
		--help)
			help ; shift
			;;
		--*)
			echo "[ERROR] Unknown option $1" ; exit 1
			;;
		-*)
			# multiple short name options. e.g. -h -v -hv
			OPTIONS=$1
			if [[ ${#OPTIONS} -eq 1 ]]; then echo "[ERROR] Unknown option $1" ; exit 1 ; fi
			for ((i=1; i<${#OPTIONS}; i++)); do
				case "-${OPTIONS:$i:1}" in
					-h)
						help
						;;
					*) 
						echo "[ERROR] Unknown option -${OPTIONS:$i:1}" ; exit 1
				esac
			done
			unset OPTIONS ; shift
			;;

		*)
			echo "[ERROR] Unknown option $1" ; exit 1
	esac
done

if [ "$(uname)" = 'Darwin' ]; then
	export DYLD_FORCE_FLAT_NAMESPACE=1
	export DYLD_INSERT_LIBRARIES=/opt/homebrew/lib/faketime/libfaketime.1.dylib
else
	# 初回にFAKETIMEが定義されていないとエラーになる為設定（_start_at_形式で登録)
	export FAKETIME="@${SETDATE} ${SETTIME}"
fi
# FAKETIME_NO_CACHEが0の場合，環境変数FAKETIME変更時の反映に少し時間がかかる為
export FAKETIME_NO_CACHE=1

if [[ $FLAG_GENERATEDATA = "YES" ]]; then generate_dummydata ; fi
if [[ $FLAG_READDATA = "YES" ]]; then read_dummydata ; fi
if [[ $FLAG_SIMULATE = "YES" ]]; then exec_simulation ; fi
if [[ $BACKUP != "NO" ]]; then backup_files $BACKUP; fi

exit 0
