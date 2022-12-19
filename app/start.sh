error="error: 引数が正しくありません．start.sh -h を実行し，引数を確認してください．"

setdate="2020-01-01"
settime="00:00:00"

FLAG_GENERATEDATA=1
FLAG_READDATA=1
FLAG_SIMULATE=1

help(){
cat << EOS
ヘルプ）こんにちは

使い方：
-h or --help：
	当プログラムの説明を表示します．
-i or --init [YYYY-MM-DD]：
	日付形式を指定し，その日付からシミュレーションを開始します．
EOS
}


dateinit(){
	setdate="$1"
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
	node simulate.js --init "${setdate}" -d 5
}


# シミュレーションの実行
# -- 過去のシミュレーションの続きとして1000日間のシミュレーションを行う
# node simulate.js -d 335

# 以下は今後作成予定...

# # シミュレーション結果の概要の出力
# # -- user001 の行動の概略を出力する
# node show_simulation_result.js user001

# https://chitoku.jp/programming/bash-getopts-long-options#fn-8
while getopts "ih-:" opt
do
	# OPTIND 番目の引数を optarg へ代入
	optarg="${!OPTIND}"
	# echo "OPTIND: ${OPTIND}"
	# echo "\${!OPTIND}: ${optarg}"
	[ "$opt" = - ] && opt="-$OPTARG"
	case "-$opt" in
		-h|--help)
			help
			exit 0
			;;
		-i|--init)
			_=${optarg:?"${error}"}
			dateinit $optarg
			shift
			;;
		--)
			break
			;;
		-\?)
			exit 1
			;;
		--*)
			echo "$0: illegal option -- ${opt##-}" >&2
			exit 1
			;;
	esac
done
shift $((OPTIND -1))


if [ "$(uname)" = 'Darwin' ]; then
	export DYLD_FORCE_FLAT_NAMESPACE=1
	export DYLD_INSERT_LIBRARIES=/opt/homebrew/lib/faketime/libfaketime.1.dylib
else
	# 初回にFAKETIMEが定義されていないとエラーになる為設定（_start_at_形式で登録)
	export FAKETIME="@${setdate} ${settime}"
fi
# FAKETIME_NO_CACHEが0の場合，環境変数FAKETIME変更時の反映に少し時間がかかる為
export FAKETIME_NO_CACHE=1

# if [ $FLAG_GENERATEDATA -eq 1 ];then
exec_simulation