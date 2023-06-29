var express = require('express');
var router = express.Router();
var models = require('../models/index.js');
var func = require('../op_tools/functions.js');
const dayjs = require('dayjs');
const { exec } = require('child_process');

/* API routes */
router.post('/simulate', function(req, res, next){
  var resMsg = "";
  exec('./start.sh -h', (err, stdout, stderr) => {
    if(err){
      resMsg = `stderr: ${stderr}`;
    }
    resMsg = `stdout: ${stdout}`;
    res.send(req.body);
  });
});

module.exports = router;
