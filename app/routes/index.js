var express = require('express');
var router = express.Router();
var models = require('../models/index.js');
var func = require('../op_tools/functions.js');
const dayjs = require('dayjs');
const { exec } = require('child_process');

/* GET home page. */
router.get('/', async function(req, res, next) {
  
  const sim_log = await models.SimulationLog.findOne({
    order: [ ['updatedAt', 'DESC']],
  });
  res.render('index', {
    title: 'Express',
    link: {
      parent: "/",
      user: "/users"
    },
    logs: sim_log,
    func:{
      ddate: func.ddate
    },
  });
});

module.exports = router;
