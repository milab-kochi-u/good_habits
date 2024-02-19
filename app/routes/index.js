var express = require('express');
var router = express.Router();
var models = require('../models/index.js');
const dayjs = require('dayjs');

/* GET home page. */
router.get('/', async function(req, res, next) {
  
  let sim_log = undefined
  let user_link = undefined
  try{
    sim_log = await models.SimulationLog.findOne({
      order: [ ['updatedAt', 'DESC']],
    });
    user_link = '/users'
  }catch(err){
    console.log(`error: SimulationLogテーブルが存在しません`)
  }
  res.render('index', {
    title: 'Express',
    link: {
      parent: "/",
      user:user_link 
    },
    logs: JSON.stringify(sim_log),
  });
});

module.exports = router;
