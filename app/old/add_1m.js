const dayjs = require('dayjs');

today = dayjs();
console.log(today.add(1,'m').second(0).format('YYYY-MM-DD HH:mm:ss'));