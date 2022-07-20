# 初期化
if [ "$(uname)" == 'Darwin' ]; then
	export DYLD_FORCE_FLAT_NAMESPACE=1
	export DYLD_INSERT_LIBRARIES=/opt/homebrew/lib/faketime/libfaketime.1.dylib
fi
START_TIME="2020-01-01 00:00:00"
export FAKETIME="${START_TIME}"
export FAKETIME_NO_CACHE=1
node test_database.js