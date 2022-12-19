var express = require('express');
var router = express.Router();
var models = require('../models/index.js');

/* GET home page. */
router.get('/', async function(req, res, next) {
  res.render('index', {
     title: 'Express',
     users: await models.User.findAll(),
  });
});

// router.get('/user/:id', function(req, res,next) => {

// });

module.exports = router;
