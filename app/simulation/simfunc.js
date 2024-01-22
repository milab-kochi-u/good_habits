const fs = require('fs');
const models = require('../models/index.js');
const mathlib = require('../util/mathlib.js');
const { recommend } = require('../util/manageapi.js');
const { QueryTypes } = require('sequelize');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
var utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

const sim = {};

// ログ出力設定
const out = fs.createWriteStream('sim_result.log',{ mode: 0o755 });
const err = fs.createWriteStream('sim_result.log',{ mode: 0o755 });
const logger = new console.Console(out,err);
sim.info_h = (...msg) => {
  const head = `[${dayjs().format('YYYY-MM-DD HH:mm')}][info]: `;
  logger.log(head,...msg);
  console.log(head,...msg);
}
sim.user_h = (user,...msg) => {
  const head = `[${dayjs().format('YYYY-MM-DD HH:mm')}][user_${user.id}]: `;
  logger.log(head,...msg);
}

// userの最新のモチベーションを取得する
sim.getMotivation = async function(user){
  const result = await models.sequelize.query(' \
    SELECT motivation FROM UsersMotivations \
    WHERE UserId = :userid \
    ORDER BY createdAt DESC',
    {
      replacements: {userid: user.id},
      type: QueryTypes.SELECT,
      raw: true,
    },
  );
  return result[0].motivation;
}

async function getRecentElmsWave(id, idName, tableName){
  let query = ` 
    SELECT value FROM ${tableName} \
    WHERE ${idName} = ${id} \
    ORDER BY createdAt DESC \
    LIMIT 1
    `;
  const result = await models.sequelize.query(query,{type: QueryTypes.SELECT, raw:true},);
  return result[0].value;
}
// user, work, schemeの最新の波の値を返す
sim.getRecentUsersWave = async user => await getRecentElmsWave(user.id, "UserId", "UsersWaves");
sim.getRecentWorksWave = async work => await getRecentElmsWave(work.id, "WorkId", "WorksWaves");
sim.getRecentSchemesWave = async scheme => await getRecentElmsWave(scheme.id, "SchemeId", "SchemesWaves");

// a, b の day 日めの相性を調べる（相性度: 0〜1, 大きいほど相性が良い）
sim.checkChemistry = function(a, b, day) {
	const aPhase = Math.sin(2 * Math.PI / (24 - a['waveLength']) * (day - a['initialPhase']));
	const bPhase = Math.sin(2 * Math.PI / (24 - b['waveLength']) * (day - b['initialPhase']));
	return 1.0 - Math.abs(aPhase - bPhase) / 2;
}
sim.checkChemistry2 = async function({
  user,
  work,
  scheme
}){
  if(typeof user === 'undefined') {
    return 1.0 - Math.abs(await this.getRecentWorksWave(work) - await this.getRecentSchemesWave(scheme)) / 2;
  }else if(typeof work === 'undefined'){
    return 1.0 - Math.abs(await this.getRecentUsersWave(user) - await this.getRecentSchemesWave(scheme)) / 2;
  }else if(typeof scheme === 'undefined'){
    return 1.0 - Math.abs(await this.getRecentUsersWave(user) - await this.getRecentWorksWave(work)) / 2;
  }
}
// Userとn番目に相性の良いWork,Schemeを返す
sim.getGoodWorS = async function(user,all_WorS,passedDays,isWork=true,n=1){
  // TODO: ワークを決める際にカテゴリの相性を考慮する
  let calculated_list = [];
  let calculated_index_list = [];
  if(all_WorS.length == 1) return all_WorS[0];
  for(let i = 0; i < n; i++){
    let maxChemistry = -1;
    let selectedWorS = null;
    const all = all_WorS.filter(elm=>!(calculated_index_list.includes(elm.id)));
    if(!all.length) {
      return calculated_list.slice(-1)[0];
    }
    for(let WorS of all){
      let chemistry;
      if(isWork) chemistry = mathlib.round(await this.checkChemistry2({user:user,work: WorS}));
      else chemistry = mathlib.round(await this.checkChemistry2({user:user, scheme: WorS}));
      if(chemistry > maxChemistry){
        selectedWorS = WorS;
        maxChemistry = chemistry;
      }
    }
    calculated_list.push(selectedWorS);
    calculated_index_list.push(selectedWorS.id);
  }
  return calculated_list[n-1];
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
  this.user_h(user, user.name, 'さんのモチベーションが変更になります．');
  if(typeof motiv_increase_val !== 'undefined'){
    new_obj.motivation = mathlib.adjust(mathlib.round(new_obj.motivation + motiv_increase_val));
    this.user_h(user, `motivation: ${res.motivation} → ${new_obj.motivation}`);
  }
  if(typeof totalMotivation !== 'undefined'){
    new_obj.totalMotivation = totalMotivation;
    this.user_h(user, `totalMotivation: ${res.totalMotivation} → ${new_obj.totalMotivation}`);
  }
  if(typeof motiv_need_to_getStart !== 'undefined'){
    new_obj.motiv_need_to_getStart = motiv_need_to_getStart;
    this.user_h(user, `motiv_need_to_getStart: ${res.motiv_need_to_getStart} → ${new_obj.motiv_need_to_getStart}`);
  }
  if(typeof motiv_need_to_getItDone !== 'undefined'){
    new_obj.motiv_need_to_getItDone = motiv_need_to_getItDone;
    this.user_h(user, `motiv_need_to_getItDone: ${res.motiv_need_to_getItDone} → ${new_obj.motiv_need_to_getItDone}`);
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