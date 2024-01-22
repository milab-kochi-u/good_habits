var express = require('express');
var router = express.Router();
var models = require('../models/index.js');
const dayjs = require('dayjs');

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
    logs: JSON.stringify(sim_log),
  });
});

module.exports = router;
