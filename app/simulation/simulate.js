const dayjs = require('dayjs');
const yargs = require('yargs');
const { Op } = require("sequelize");
const mathlib = require('../util/mathlib.js');
const models = require('../models/index.js');
const sim = require('./simfunc.js');
const {info_h, user_h} = require('./simfunc.js');


(async() => {
  yargs
    .option('init', {
      description: '過去のシミュレーション結果を削除し，指定の日付からのシミュレーションを行う'
    })
    .option('days', {
      alias: 'd',
      description: '指定した日数のシミュレーションを行う',
      type: 'number',
      default: 365,
    })
    .option('doRecommend',{
      type: 'boolean',
    })
    .option('recommendInTheMiddle',{
      type: 'number',
    })
    .version().alias('v', 'version')
    .help().alias('h', 'help')
    .example(`$0 --init 2020-01-01 --days 500`)
    .example(`$0 -d 3650`);
  try {
    const argv = yargs.check(args => {
      if (args._.length != 0) throw new Error('不明な引数が指定されています');
      if ('init' in args) {
        if (!(dayjs(args.init).isValid())) throw new Error('日付の指定が正しくありません');
      }
      if (args.days === parseInt(args.days) && args.days > 0) return true;
      else throw new Error('日数の指定が正しくありません');
    }).parseSync();
    await models.sequelize.sync();
    let simulationStartDate = undefined;
    let date = undefined;
    if ('init' in argv) {
      date = dayjs(argv.init);
      // シミュレーション結果の削除
      await models.Task.truncate({ force: true, restartIdentity: true });
      await models.UsersScheme.truncate({ force: true, restartIdentity: true });
      await models.UsersWork.truncate({ force: true, restartIdentity: true });
      await models.SimulationLog.truncate({ force: true, restartIdentity: true });
      await models.UsersMotivation.truncate({ force: true, restartIdentity: true });
      await models.UsersWave.truncate({ force: true, restartIdentity: true });
      await models.WorksWave.truncate({ force: true, restartIdentity: true });
      await models.SchemesWave.truncate({ force: true, restartIdentity: true });
      // SQLite3 だと restartIdentity が効かない？
      await models.User.update({ lastSelfReflectedAt: null }, { where: {} });
    }
    if (!date) {
      const lastLog = await models.SimulationLog.findOne({
        order: [ ['createdAt', 'DESC'] ]
      });
      if (lastLog) date = dayjs(dayjs(lastLog.finishedAt).format('YYYY-MM-DD')).add(1, 'day');
      else date = dayjs();
      const firstLog = await models.SimulationLog.findOne({
        order: [ ['createdAt', 'ASC'] ]
      });
      if (firstLog) simulationStartDate = dayjs(dayjs(firstLog.startedAt).format('YYYY-MM-DD'));
    }
    // シミュレーションの開始日と終了日をログに記録する
    delete process.env.FAKETIME;
    info_h('処理速度の計測を開始します．');
    let execT_start = performance.now();
    info_h(`シミュレーションを開始します: ${dayjs().format('YYYY/MM/DD HH:mm:ss')}`);
    if (!simulationStartDate) simulationStartDate = dayjs(date);    // 過去のシミュレーションも含めた開始日
    const simulationFinishDate = date.add(argv.days-1, 'day');
    const simLog = await models.SimulationLog.create({
      startedAt: date,    // 今回のシミュレーションの開始日
      // finishedAt: simulationFinishDate,    // シミュレーション終了日（実際のシミュレーション終了時に更新する）
    });
    info_h('simulationStartDate:', simulationStartDate.format('YYYY/MM/DD'));
    info_h('simulationFinishDate:', simulationFinishDate.format('YYYY/MM/DD'));

    // users,works,schemesは途中で増減しない前提
    const users = await models.User.findAll();
    const works = await models.Work.findAll();
    const schemes = await models.Scheme.findAll();

    // reschedule test -----
    // let cnt = 0;

    // reschedule test -----
    for (let day = 0; day < argv.days; day++) {
      // 以降，FAKETIME で日付を騙す
      process.env['FAKETIME'] = "@" + date.format('YYYY-MM-DD HH:mm:ss');

      info_h(day+1, '日目:', date.format('YYYY/MM/DD HH:mm'));
      const passedDays = date.diff(simulationStartDate, 'day');
      info_h('シミュレーション開始から', passedDays, '日経過');

      // workの波をテーブルに登録
      let insertWorksWaves = [];
      for(let work of works){
        const worksWaveValue = mathlib.round(Math.sin(2 * Math.PI / (24 - work['waveLength']) * (day - work['initialPhase'])),3);
        insertWorksWaves.push({
          value: worksWaveValue,
          date: date.format('YYYY.MM.DD'),
          WorkId: work.id,
        });
      }
      await models.WorksWave.bulkCreate(insertWorksWaves);

      // schemeの波をテーブルに登録
      let insertSchemesWaves = [];
      for(let scheme of schemes){
        const schemesWaveValue = mathlib.round(Math.sin(2 * Math.PI / (24 - scheme['waveLength']) * (day - scheme['initialPhase'])),3);
        insertSchemesWaves.push({
          value: schemesWaveValue,
          date: date.format('YYYY.MM.DD'),
          SchemeId: scheme.id,
        });
      }
      await models.SchemesWave.bulkCreate(insertSchemesWaves);

      // usersの波をテーブルに登録(まだ利用していないユーザは除く)
      let insertUsersWaves = [];
      for (let user of users.filter((user) => {return user.startDays <= day;})){
        const usersWaveValue = mathlib.round(Math.sin(2 * Math.PI / (24 - user['waveLength']) * (day - user['initialPhase'])),3);
        insertUsersWaves.push({
          value: usersWaveValue,
          date: date.format('YYYY.MM.DD'),
          UserId: user.id,
        });
      }
      await models.UsersWave.bulkCreate(insertUsersWaves);
      for (let user of users) {
        if (user.startDays > day) continue;  // まだ利用を始めていない
        let addedWorks = await user.getWorks();
        const usersWaveValue = await sim.getRecentUsersWave(user);
        user_h(user,user.name, 'の本日の波：', usersWaveValue);

        // ワークが未決定なら決定する
        if (addedWorks.length < 1) {
          user_h(user, user.name, 'が利用開始します');
          // 初回はusersMotivationsテーブルへ登録
          const UMlength = (await user.getUsersMotivations()).length;
          if(UMlength == 0){
            await user.createUsersMotivation({
              motivation: user.initialMotivation,
            });
          }
          let selectedWork = sim.getGoodWorS(user,works,passedDays);
          user_h(user, user.name, 'は', selectedWork.label, 'を継続させたいワークに設定します');
          await user.addWork(selectedWork);

          // 工夫を決める
          let selectedScheme = sim.getGoodWorS(user,schemes,passedDays);
          user_h(user, user.name, 'は工夫「',selectedScheme.label,'」を採用します．');
          await user.addScheme({work: selectedWork, scheme: selectedScheme});
          addedWorks = await user.getWorks();
        }

        // 本日のモチベーションを決める
        let todays_inc_val = 0;
        const todays_users_motivation = await sim.getMotivation(user);
        todays_inc_val += mathlib.round(((user.featureOfStart + user.featureOfComplete) - 1) / 25);
        if(usersWaveValue > 0.95) todays_inc_val += 0.02;
        else if(usersWaveValue < -0.92)todays_inc_val += -0.03;
        else todays_inc_val += -0.02;
        if(todays_users_motivation >= 1) todays_inc_val += -0.05;
        else if(todays_users_motivation <= 0) todays_inc_val += 0.03;

        await sim.changeMotivation(user,{
          motiv_increase_val: todays_inc_val,
        }); 
          
        // 次の振り返り日を決める
        let nextSelfReflected = dayjs(date).subtract(1, 'day');
        if (user.lastSelfReflectedAt !== null && dayjs(user.lastSelfReflectedAt).isValid()) {
          nextSelfReflected = dayjs(user.lastSelfReflectedAt).add(user.intervalDaysForSelfReflection, 'day');
        }

          // 予定の振り返り（タスク登録
        if (nextSelfReflected.diff(date, 'day') < 1) {
          user_h(user, user.name, 'が振り返ります');

          // TODO: ワークを変更するかを検討し，変更する場合は変更できるようにする
          // TODO: 複数のワークを設定できるようにする

          // TODO: 複数の工夫を設定できるようにする
          // TODO: 時間もまばらにする（全部19:00になってる）
          for (addedWork of addedWorks) {
            // TODO: 今までの履歴も振り返る
            const history = await sim.resultsOfTask(user,addedWork, date, 7);
            user_h(user, user.name, 'さんの予定実施結果:', history);
            const efficacy_rate = history['successFinish'] / history['taskCount'];
            user_h(user,'実施率：', new Intl.NumberFormat('ja',{style: 'percent'}).format(efficacy_rate));
            if(!isNaN(efficacy_rate) && efficacy_rate < 0.5){
              // 工夫を選び直す
              let selectedScheme = undefined;
              if(('recommendInTheMiddle' in argv && passedDays >= argv.recommendInTheMiddle) || 'doRecommend' in argv){
                let selectedSchemes = await sim.getRecommendedScheme(user,addedWork);
                if(selectedSchemes){
                  selectedSchemes = Object.entries(selectedSchemes).map(([key,value]) => ({key,value}));
                  selectedSchemes.sort((a,b) => b.value - a.value);
                  selectedScheme = await models.Scheme.findOne({
                    where: {label: selectedSchemes[0].key},
                  });
                  user_h(user, user.name, 'さんは工夫を推薦された「', selectedScheme.label, '」に変更しました．');
                }else{
                  user_h(user, user.name, 'さんは工夫を変更しませんでした．');
                }
              }else{
                selectedScheme = sim.getGoodWorS(user,schemes,passedDays);
                user_h(user, user.name, 'さんは工夫を「', selectedScheme.label, '」に変更しました．');
              }
              if(typeof selectedScheme !== 'undefined'){
                await user.changeScheme({work:addedWork,scheme:selectedScheme});
              }
            }
            for (let d = 0; d < user.intervalDaysForSelfReflection; d++) {
              // TODO: 予定を立てられるようにする
              // const chemistry = mathlib.round(sim.checkChemistry(user, addedWork, passedDays));
              const chemistry = await sim.checkChemistry2({user:user, work:addedWork});
              if (chemistry < 0.1) continue;  // (仮) 0.1未満なら予定を立てない
              const task = await user.createTask({
                work: addedWork,
                start_time : dayjs(date).add(d, 'day').add(19, 'hour'), // (仮) 常に19時〜20時の予定とする
                end_time : dayjs(date).add(d, 'day').add(20, 'hour'),
              });
              user_h(user, user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'に', addedWork.label, 'を実施する予定を立てました');
            }
          }
          user.lastSelfReflectedAt = date;
          user.save();
        }

        // 予定（タスク）の実施報告
        let UsersWorks = await user.getWorks();
        for(let w of UsersWorks){
          let tasks = await user.getTasks(w);
          for(let task of tasks){
            if(dayjs(task.start_time).format('YYYY-MM-DD') !== dayjs(date).format('YYYY-MM-DD')){
              continue;
            }

            // reschedule test -----
            // if (cnt == 0){
            //     const new_start = dayjs(task.start_time).add(12,'h');
            //     const new_end = dayjs(task.end_time).add(12,'h');
            //     task.reschedule(new_start,new_end);
            //     cnt = 1;
            //     continue;
            // }
                // TODO: 新タスクが当日中だとforeachで拾えないので対策が必要
            // ----- end reschedule test -----

            // 時間をタスクの開始・終了時間まで進める
            process.env['FAKETIME'] = "@" + dayjs(task.start_time).format('YYYY-MM-DD HH:mm:ss');

            // 当日にユーザがタスクを実施するかどうかを決める
            // initialMotivation, ユーザ・ワーク相性, ユーザ・工夫相性の兼ね合いで決まる
            const selectedScheme = (await user.getCurrentSchemes({work: w}))[0];
            const currentMotivation = (await models.UsersMotivation.findOne({
              where: { UserId: user.id},
              order: [[ 'createdAt', 'DESC']],
            })).motivation;

            //総合モチベーション
            // const totalMotivation = mathlib.round(currentMotivation * 0.6 +  sim.checkChemistry(user, w, passedDays) * 0.25 + sim.checkChemistry(user, selectedScheme, passedDays) * 0.15);
            const totalMotivation = mathlib.round(currentMotivation * 0.6 +  await sim.checkChemistry2({user:user, work:w}) * 0.25 + await sim.checkChemistry2({user:user, scheme:selectedScheme}) * 0.15);
            //開始に必要なモチベーション
            const motiv_nedd_to_getStart = mathlib.round((1.05 - user.featureOfStart) - ((selectedScheme.chemistry_featureOfStart - 0.5) * 0.3));
            //終了に必要なモチベーション
            const motiv_need_to_getItDone = mathlib.round((1.05 - user.featureOfComplete) - ((selectedScheme.chemistry_featureOfComplete - 0.5) * 0.3));
            user_h(user,user.name, 'さんの本日の総合モチベーション：', totalMotivation, '    開始に必要な総合モチベーション:', motiv_nedd_to_getStart);
            // DBに登録
            await sim.changeMotivation(user, {
              totalMotivation: totalMotivation,
              motiv_need_to_getStart: motiv_nedd_to_getStart,
              motiv_need_to_getItDone: motiv_need_to_getItDone,
            });
            // モチベーションの上昇量
            let motiv_increase_val = 0;
            // やる気に対して，必要とされるやる気の閾値は”とりかかりの特性値”で決める
            if (totalMotivation <= motiv_nedd_to_getStart){ // ワークの難易度によって閾値が増減する
            // if (totalMotivation < mathlib.round(1 - user.featureOfStart + ワークの難易度)){
              user_h(user, '本日はサボりました...');
            }else{
              //　とりかかり成功
              motiv_increase_val += 0.01;
              // task.open(task.start_time);
              task.open(dayjs());
              user_h(user, user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'の予定[work:' + w.label + ']を' + dayjs().format('YYYY/MM/DD HH:mm:ss') + 'に開始しました．');

              user_h(user,'終了に必要な総合モチベーション:', motiv_need_to_getItDone);
              if(totalMotivation > motiv_need_to_getItDone){ // やりきる
                process.env['FAKETIME'] = "@" + dayjs(task.end_time).format('YYYY-MM-DD HH:mm:ss');
                // task.close(task.end_time);
                task.close(dayjs());
                // console.log('           ', user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'の予定[work:' + w.label + ']を' + (process.env['FAKETIME']).split("@")[1] + 'に終了しました．');
                user_h(user, user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'の予定[work:' + w.label + ']を' + dayjs().format('YYYY/MM/DD HH:mm:ss') + 'に終了しました．');
                motiv_increase_val += 0.01;
              }else{
                user_h(user, 'やりきりませんでした...');
              }
              // モチベーションを更新する
              await sim.changeMotivation(user, {
                motiv_increase_val: motiv_increase_val,
              }); 
            }
          }
        }
        // 時間を元に戻す
        process.env['FAKETIME'] = "@" + date.format('YYYY-MM-DD HH:mm:ss');
        
      }
      date = date.add(1, 'day');  // 1日進める
    }

    // ----シミュレーション終了，分析結果----
    info_h('--------------------------------------------');
    info_h('シミュレーションが終了しました，分析結果を表示します．');
    for(let user of users){
      info_h('--------', 'UserName:' + user.name, '--------');
      const myWs = await user.getWorks();
      for(let work of myWs){
        info_h('WorkLabel:', work.label);
        info_h('result('+argv.days+'days)', await sim.resultsOfTask(user, work, date, argv.days));
      }
    }
    info_h('--------------------------------------------');
    delete process.env.FAKETIME;
    info_h('シミュレーションを完了しました: ', dayjs().format('YYYY/MM/DD HH:mm:ss'));
    simLog.finishedAt = simulationFinishDate;
    simLog.save();

    let execT_end = performance.now();
    info_h('処理時間：', mathlib.round((execT_end - execT_start) / 1000,2), '秒');
  }
  catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }

})();