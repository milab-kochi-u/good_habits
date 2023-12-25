const models = require('../models/index.js');
const mathlib = require('../util/mathlib.js');
const { recommend } = require('../util/manageapi.js');
const { QueryTypes } = require('sequelize');
const { Op } = require('sequelize');
const dayjs = require('dayjs');

const sim = {};
// userの最新のモチベーションを取得する
sim.getMotivation = async function(user){
  const result = await models.sequelize.query(' \
    SELECT motivation FROM UsersMotivations \
    WHERE UserId = :userid \
    ORDER BY createdAt DESC',
    {
      replacements: {userid: user.id},
      type: QueryTypes.SELECT,
    },
  );
  return result[0].motivation;
}

sim.getRecentUsersWave = async function(user){
  console.log(dayjs().format('YYYY-MM-DD'));
  const result = await models.sequelize.query(' \
    SELECT value FROM UsersWaves \
    WHERE UserId = :userid \
    AND date <= :date \
    AND date >= :date',
    {
      replacements: {
        userid: user.id,
        date: dayjs().format('YYYY-MM-DD'),
      },
      type: QueryTypes.SELECT,
    }
  );
  console.log('?',result);
  process.exit(1);
}

// a, b の day 日めの相性を調べる（相性度: 0〜1, 大きいほど相性が良い）
// TODO: 現在は日毎に計算しているのみであるが，日毎の値もDBに登録しておきたい．
sim.checkChemistry = function(a, b, day) {
	const aPhase = Math.sin(2 * Math.PI / (24 - a['waveLength']) * (day - a['initialPhase']));
	const bPhase = Math.sin(2 * Math.PI / (24 - b['waveLength']) * (day - b['initialPhase']));
	return 1.0 - Math.abs(aPhase - bPhase) / 2;
}

// Userと相性の良いWork,Schemeを返す
sim.getGoodWorS = function(user,all_WorS,passedDays){
  // TODO: ワークを決める際にカテゴリの相性を考慮する
  let maxChemistry = -1;
  let selectedWorS = null;
  for(let WorS of all_WorS){
    const chemistry = mathlib.round(sim.checkChemistry(user,WorS,passedDays));
    if(chemistry > maxChemistry){
      selectedWorS = WorS;
      maxChemistry = chemistry;
    }
  }
  return selectedWorS;
}

// userのモチベーションを指定値だけ増減させる（負の数も可能）
sim.changeMotivation = async function(user, {
  motiv_increase_val,
  totalMotivation,
  motiv_need_to_getStart,
  motiv_need_to_getItDone
} = {})
{
  const res = (await models.sequelize.query(' \
    SELECT motivation, totalMotivation, motiv_need_to_getStart, motiv_need_to_getItDone \
    FROM UsersMotivations \
    WHERE UserId = :userid \
    ORDER BY createdAt DESC',
    {
      replacements: {userid: user.id},
      type: QueryTypes.SELECT,
    },
  ))[0];
  const new_obj = {
    motivation: res.motivation,
    totalMotivation: res.totalMotivation,
    motiv_need_to_getStart: res.motiv_need_to_getStart,
    motiv_need_to_getItDone: res.motiv_need_to_getItDone,
  }
  console.log('     ', user.name, 'さんのモチベーションが変更になります．');
  if(typeof motiv_increase_val !== 'undefined'){
    new_obj.motivation = mathlib.adjust(mathlib.round(new_obj.motivation + motiv_increase_val));
    console.log('     ', `motivation: ${res.motivation} -> ${new_obj.motivation}`);
  }
  if(typeof totalMotivation !== 'undefined'){
    new_obj.totalMotivation = totalMotivation;
    console.log('     ', `totalMotivation: ${res.totalMotivation} -> ${new_obj.totalMotivation}`);
  }
  if(typeof motiv_need_to_getStart !== 'undefined'){
    new_obj.motiv_need_to_getStart = motiv_need_to_getStart;
    console.log('     ', `motiv_need_to_getStart: ${res.motiv_need_to_getStart} -> ${new_obj.motiv_need_to_getStart}`);
  }
  if(typeof motiv_need_to_getItDone !== 'undefined'){
    new_obj.motiv_need_to_getItDone = motiv_need_to_getItDone;
    console.log('     ', `motiv_need_to_getItDone: ${res.motiv_need_to_getItDone} -> ${new_obj.motiv_need_to_getItDone}`);
  }
  await user.createUsersMotivation(new_obj);
}

// おすすめの工夫を取得する
sim.getRecommendedScheme = async function(user,work){
  try{
    const result = await recommend("db-dev.sqlite3", user.id, work.id);
    return result;
  }catch(e){
    throw e;
  }
}

// 期間内のタスク実施結果を返す
// 返り値: {"taskCount": 7, "successStart": 5, "successFinish": 4}
sim.resultsOfTask = async function(user, work, date, dayCount) {
  let startTime = dayjs(date).subtract(dayCount, 'day');
  const wh = {
    [Op.and]: [
      { start_time: { [Op.gte]: startTime.toDate() } },
      { end_time: { [Op.lt]: date.toDate() } }
    ]
  };
  let tasks = await user.getTasks(work, wh);
  // console.log(startTime.format('YYYY-MM-DD'), date.format('YYYY-MM-DD'), user.name, work.label, tasks);
  // WARN: 現在はresultの値はタスクを開始した時点で1にしているのであまり当てにしない
  return {
    'taskCount': tasks.length,
    // 'successStart': tasks.filter(task => task.started_at != null).length,  // start_at が null じゃない回数
    'successFinish': tasks.filter(task => task.finished_at != null).length, // finish_at が null じゃない回数
    'successResult': tasks.filter(task => task.result == true).length, // result = True の回数
  }
}

module.exports = sim;