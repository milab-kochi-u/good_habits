#!/bin/bash

help(){
	cat <<- EOS

	ヘルプ）こんにちは
		本スクリプトは三好研究室の「習慣化支援システム」のシミュレーションプログラムです．
	使い方：
	-h or --help：
	    当プログラムの説明を表示します．
	-i or --init [YYYY-MM-DD]：
	    日付形式を指定し，その日付からシミュレーションを開始します．
	-D or --Day [integer]:
	    シミュレーションの期間を設定します．
	--no-sim:
	    シミュレーションを実行しません．
	--data-gen:
	    プロファイルを再作成します．
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
	node generate_dummydata.js > dummydata.json
}

# ダミーデータを読み込む
read_dummydata(){
	node import_dummydata.js dummydata.json
}

# シミュレーションの実行
exec_simulation(){
	# -- 過去のシミュレーション結果を削除し，2020年1月1日から365日間のシミュレーションを行う
	node simulate.js --init "${SETDATE}" -d "${SETDAYS}"
}


# シミュレーションの実行
# -- 過去のシミュレーションの続きとして1000日間のシミュレーションを行う
# node simulate.js -d 335

# 以下は今後作成予定...

# シミュレーション結果の概要の出力
# -- user001 の行動の概略を出力する
# node show_simulation_result.js user001

# https://zenn.dev/takakiriy/articles/e65780261dd5e3
SETDATE="2020-01-01"
SETTIME="00:00:00"
SETDAYS="10"
FLAG_GENERATEDATA="NO"
FLAG_READDATA="NO"
FLAG_SIMULATE="YES"
while [[ $# -gt 0 ]]; do
	case $1 in
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
					;;
			esac
			;;
		-D|--Day)
			if [[ -z $2 ]] ; then echo "[ERROR] $1 must have parameter." ; exit 1 ; fi
			if [[ ! "$2" =~ (^[1-9][0-9]*) ]] || [[ "${BASH_REMATCH[0]}" != "$2" ]]; then echo "[ERROR] $1 parameter must be in non zero interger." ; exit 1 ; fi
			SETDAYS="$2" ; shift ; shift
			;;

		# ---- flag options ----
		--no-sim)
			FLAG_SIMULATE="NO" ; shift
			;;
		--data-gen)
			FLAG_GENERATEDATA="YES"
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
						;;
				esac
			done
			unset OPTIONS ; shift
			;;

		*)
			echo "[ERROR] Unknown option $1" ; exit 1
			;;
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

exit 0
