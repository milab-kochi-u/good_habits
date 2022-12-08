setdate="2020-01-01"
settime="00:00:00"

help(){
cat << EOS
ヘルプテスト）こんにちは
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
			shift
			;;
		-i|--init)
			dateinit $optarg
			shift
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

exec_simulation


