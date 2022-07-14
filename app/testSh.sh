# 初期化
START_TIME="@2020-01-01 00:00:00"
export FAKETIME="${START_TIME}"
node test_database.js 0

for ((i=`date +%s -- date${STSRT_TIME:1}`))
node test_database.js "${FAKETIME:1}"
はひ
export FAKETIME="@2020-01-05 00:00:00"
date
export FAKETIME=`node test_date.js "${FAKETIME:1}" 5 m`
dat