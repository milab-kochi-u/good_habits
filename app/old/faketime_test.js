const dayjs = require('dayjs');

setInterval(function(){
    const today = dayjs().format('YYYY-MM-DD HH:mm:ss');
    console.log(today);
},5000);