if [ "$(uname)" == 'Darwin' ]; then
	export DYLD_FORCE_FLAT_NAMESPACE=1
	export DYLD_INSERT_LIBRARIES=/opt/homebrew/lib/faketime/libfaketime.1.dylib
fi
export FAKETIME_NO_CACHE=1

# ダミーデータの生成
# node generate_dummydata.js > dummydata.json
# ダミーデータを読み込む
# node import_dummydata.js dummydata.json

# シミュレーションの実行
# -- 過去のシミュレーション結果を削除し，2020年1月1日から365日間のシミュレーションを行う
node simulate.js --init 2020-01-01 -d 3

# シミュレーションの実行
# -- 過去のシミュレーションの続きとして1000日間のシミュレーションを行う
# node simulate.js -d 335

# 以下は今後作成予定...

# # シミュレーション結果の概要の出力
# # -- user001 の行動の概略を出力する
# node show_simulation_result.js user001
