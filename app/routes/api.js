var express = require('express');
var router = express.Router();
var models = require('../models/index.js');
var func = require('../op_tools/functions.js');
const dayjs = require('dayjs');
const { exec } = require('child_process');

/* API routes */
router.get('/simulate', async function(req, res, next){
  var resMsg = "";
  await exec('./start.sh -h', (err, stdout, stderr) => {
    if(err){
      res.status(409).send('[ERROR]既に起動されています．時間を空けて再度リクエストしてください．');
    }else{
      res.send(`stdout: ${stdout}`);
    }
  });
});

module.exports = router;
