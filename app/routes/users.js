var express = require('express');
var router = express.Router();
var models = require('../models/index.js');
var func = require('../op_tools/functions.js');
const dayjs = require('dayjs');
const work = require('../models/work.js');

/* GET users listing. */
router.get('/', async function(req, res, next) {
  res.render('user_dashboard', { 
    title: 'users dashboard',
    link: {
      parent: "/",
      user: "/users"
    },
    users: await models.User.findAll(),
  });
});

router.get('/:id', async function(req, res, next){
  let graph_data = [];
  const user = await models.User.findByPk(req.params['id']);
  const sim_log = await models.SimulationLog.findOne({order: [ ['updatedAt', 'DESC']]});
  const userStartDay = dayjs(sim_log.startedAt).add(user.startDays,'d');
  const diff = dayjs(sim_log.finishedAt).diff(userStartDay,'day');
  const usersMotivations = JSON.parse(JSON.stringify(await user.getUsersMotivations()));
  const usersWaves = JSON.parse(JSON.stringify(await user.getUsersWaves()));
  // ---- Warn ----
    // 以下はワークが1人単一だと仮定した場合の処理に留意すること
  const usersWork = (await user.getWorks())[0];
  const worksWaves = JSON.parse(JSON.stringify(await usersWork.getWorksWaves()));
  // ---- Warn ----
  for(let i = 0;i <= diff; i++){
    const motivations_day_i = usersMotivations.filter(elm => {
      return dayjs(elm.createdAt).format('YYYY/MM/DD') == userStartDay.add(i,'d').format('YYYY/MM/DD');
    });
    const waves_day_i = usersWaves.filter(elm => {
      return dayjs(elm.date).format('YYYY/MM/DD') == userStartDay.add(i,'d').format('YYYY/MM/DD');
    });
    const work_waves_day_i = worksWaves.filter(elm => {
      return dayjs(elm.date).format('YYYY/MM/DD') == userStartDay.add(i,'d').format('YYYY/MM/DD');
    });
    graph_data[i] = {
      x: userStartDay.add(i,'d').format('YYYY-MM-DD'),
      task:0,
      started_task:0,
      finished_task:0,
      successful_task:0,
      motivations: motivations_day_i,
      waves: waves_day_i,
      worksWaves: work_waves_day_i,
    }
    // console.log("graph_data[", i,"]={x:",graph_data[i].x,", y:", graph_data[i].y,"}");
  }

  // タスクの内，実施結果が成功したものを抽出
  const My_user_works = await user.getUsersWorks();
  const My_work = await My_user_works[0].getWork();
  // TODO: 複数のワークに対応する
  const tasks = await My_user_works[0].getTasks({
    order: [[ 'start_time', 'ASC']],
  });
  for(var t of tasks){
    let res = graph_data.findIndex(elm => elm.x == dayjs(t.end_time).format('YYYY-MM-DD'));
    if(res != -1) {
      graph_data[res].task = graph_data[res].task + 1;
      if(t.started_at != null) graph_data[res].started_task = graph_data[res].started_task + 1;
      if(t.finished_at != null) graph_data[res].finished_task = graph_data[res].finished_task + 1;
      if(t.result == true) graph_data[res].successful_task = graph_data[res].successful_task + 1;
    }
  }
  res.render('users_status', { 
    title: user.name + '\'s dashboard',
    id : req.params['id'],
    link: {
      parent: "/users"
    },
    data: {
      user: user,
      work: My_work,
      logs: sim_log,
      graph_data: graph_data,
    },
    func:{
      ddate: func.ddate
    },
  });
});

module.exports = router;
