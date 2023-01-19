var express = require('express');
var router = express.Router();
var models = require('../models/index.js');
const dayjs = require('dayjs');


/* date function */
function ddate(dobj){
  var d = dobj ? new Date(dobj) : null;
  d = d ? d.toLocaleString('ja-JP') : "null";
  return d;
}

/* GET home page. */
router.get('/', async function(req, res, next) {
  
  const sim_log = await models.SimulationLog.findOne({
    order: [ ['updatedAt', 'DESC']],
  });
  res.render('index', {
    title: 'Express',
    link: {
      parent: "/",
      user: "/user"
    },
    logs: sim_log,
    func:{
      ddate: ddate
    },
  });
});

router.get('/user', async function(req, res,next) {
  res.render('user_dashboard', { 
    title: 'users dashboard',
    link: {
      parent: "/",
      user: "/user"
    },
    users: await models.User.findAll(),
  });
});

router.get('/user/:id', async function(req, res,next) {
  let graph_data = [];
  const user = await models.User.findByPk(req.params['id']);
  const sim_log = await models.SimulationLog.findOne({order: [ ['updatedAt', 'DESC']]});
  const diff = dayjs(sim_log.finishedAt).diff(sim_log.startedAt,'day');
  console.log("diff:" + diff);
  for(let i = 0;i <= diff; i++){
    graph_data[i] = {x: dayjs(sim_log.startedAt).add(i,'d').format('YYYY-MM-DD'), y:0}
    console.log("graph_data[", i,"]={x:",graph_data[i].x,", y:", graph_data[i].y,"}");
  }

  // タスクの内，実施結果が成功したものを抽出
  const My_user_works = await user.getUsersWorks();
  for(var w of My_user_works){
    const tasks = await w.getTasks({
      where: { result: 1 },
      order: [[ 'start_time', 'ASC']],
    });
    for(var t of tasks){
      let res = graph_data.findIndex(elm => elm.x == dayjs(t.finished_at).format('YYYY-MM-DD'));
      if(res != -1) {graph_data[res].y = graph_data[res].y + 1;}
      console.log("task id:", t.id, "  task finished:", t.finished_at, "  task result:", t.result, " index:", res);
    }
  }
  res.render('users_status', { 
    title: user.name + '\'s dashboard',
    id : req.params['id'],
    link: {
      parent: "/user"
    },
    data: {
      user: user,
      logs: sim_log,
      graph_data: graph_data,
    },
    func:{
      ddate: ddate
    },
  });
});

module.exports = router;
