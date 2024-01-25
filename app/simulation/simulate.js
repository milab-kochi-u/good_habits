const dayjs = require('dayjs');
const yargs = require('yargs');
const { Op } = require("sequelize");
const mathlib = require('../util/mathlib.js');
const models = require('../models/index.js');
const sim = require('./simfunc.js');
const {info_h, user_h} = require('./simfunc.js');
const { execSync,exec } = require('child_process');


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
    .option('recModel',{
      default: 'cf_mem_user',
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
        // const usersWaveValue = mathlib.round(Math.sin(2 * Math.PI / (24 - user['waveLength']) * (day - user['initialPhase'])),3);
        const usersWaveValue = mathlib.round((
          Math.sin
          (
            ((6 * day * Math.PI) / (24 - user['waveLength'])) * (day - user['initialPhase'])
          ) +
          Math.cos
          (
            ((2 * day * Math.PI) / (24 - user['waveLength'])) + (day * user['initialPhase'])
          ))/2 ,3);

        insertUsersWaves.push({
          value: usersWaveValue,
          date: date.format('YYYY.MM.DD'),
          UserId: user.id,
        });
      }
      await models.UsersWave.bulkCreate(insertUsersWaves);

      const debuff = ((1000-passedDays) / 1000) - 1;
      info_h('debuff:', mathlib.round(debuff, 4));

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
          let selectedWork = await sim.getGoodWorS(user,works,passedDays);
          user_h(user, user.name, 'は', selectedWork.label, 'を継続させたいワークに設定します');
          await user.addWork(selectedWork);

          // 工夫を決める(工夫は5番目に相性が良いやつ)
          let selectedScheme = await sim.getGoodWorS(user,schemes,passedDays,false,5);
          user_h(user, user.name, 'は工夫「',selectedScheme.label,'」を採用します．');
          await user.addScheme({work: selectedWork, scheme: selectedScheme});
          user_h(user, `選択した工夫のとりかかり特性との相性は${selectedScheme.chemistry_featureOfStart}, やりきる特性との相性は${selectedScheme.chemistry_featureOfComplete}です`);
          addedWorks = await user.getWorks();
        }

        // 本日のモチベーションを決める
        let todays_inc_val = 0;
        let _score = debuff;
        const todays_users_motivation = await sim.getMotivation(user);
        for(let elm of [user.featureOfStart, user.featureOfComplete]){
          if( 0 <= (elm - 0.5)){
            _score += (0 <= usersWaveValue) ? usersWaveValue * (0.026) * (elm + 1) : usersWaveValue * (0.028) * (1.5 - elm);
          }else{
            _score += (0 <= usersWaveValue) ? usersWaveValue * (0.020) * (elm + 1) : usersWaveValue * (0.043) * (1.5 - elm);
          }
          user_h(user, 'score', _score);
        }
        let ratio = 1; 
        ratio = parseInt(Math.abs(todays_users_motivation * usersWaveValue * passedDays * Math.pow(100,2)));
        ratio =  ratio % 10 == 0 ? 8 : (ratio % 10 == 1 ? 5 : (ratio % 10 == 2 ? 2 : 1));
        user_h(user, 'ratio',ratio);
        todays_inc_val += _score * ratio;
        // if(usersWaveValue > 0.87) todays_inc_val += 0.023;
        // else if(usersWaveValue < -0.80)todays_inc_val += -0.03;
        // else todays_inc_val += -0.02;
        user_h(user, '本日のモチベーション増加値(仮)', mathlib.round(todays_inc_val));

        if((todays_users_motivation + todays_inc_val) > 1) todays_inc_val += (1 - (todays_users_motivation + todays_inc_val) - 0.05);
        else if((todays_users_motivation + todays_inc_val) < 0) todays_inc_val += (-1 * (todays_users_motivation + todays_inc_val)) + 0.07;
        user_h(user, '本日のモチベーション増加値(確定)', mathlib.round(todays_inc_val));

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
                let selectedSchemes = await sim.getRecommendedScheme(user,addedWork, argv.recModel);
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
                selectedScheme = await sim.getGoodWorS(user,schemes,passedDays,false,5);
                user_h(user, user.name, 'さんは工夫を「', selectedScheme.label, '」に変更しました．');
              }
              if(typeof selectedScheme !== 'undefined'){
                await user.changeScheme({work:addedWork,scheme:selectedScheme});
                user_h(user, `選択した工夫のとりかかり特性との相性は${selectedScheme.chemistry_featureOfStart}, やりきる特性との相性は${selectedScheme.chemistry_featureOfComplete}です`);
              }
            }

            // 予定を立てる
            const chemistry = await sim.checkChemistry2({user:user, work:addedWork});
            // (仮) 0.1未満なら予定を立てない
            if (chemistry >= 0.1){
              let insertTasks = [];
              const uw = (await user.getUsersWorks({
                where: {WorkId: addedWork.id}
              }))[0];
              for (let d = 0; d < user.intervalDaysForSelfReflection; d++) {
                const start_time = dayjs(date).add(d, 'day').add(19, 'hour'); // (仮) 常に19時〜20時の予定とする
                insertTasks.push({
                  UsersWorkId: uw.id,
                  start_time : start_time,
                  end_time : dayjs(date).add(d, 'day').add(20, 'hour'),
                });
                // const task = await user.createTask({
                //   work: addedWork,
                //   start_time : dayjs(date).add(d, 'day').add(19, 'hour'), // (仮) 常に19時〜20時の予定とする
                //   end_time : dayjs(date).add(d, 'day').add(20, 'hour'),
                // });
                user_h(user, user.name, 'が', dayjs(start_time).format('YYYY/MM/DD HH:mm'), 'に', addedWork.label, 'を実施する予定を立てました');
              }
              await models.Task.bulkCreate(insertTasks);
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
            const tM_term1 = currentMotivation * 0.6;
            const tM_term2 = await sim.checkChemistry2({user:user, work:w}) * 0.4 * (1 / 3);
            const tM_term3 = await sim.checkChemistry2({work:w, scheme:selectedScheme}) * 0.4 * (1 / 3);
            const tM_term4 = await sim.checkChemistry2({user:user, scheme:selectedScheme}) * 0.4 * (1 / 3);
            user_h(user, "総合モチベ因子(基礎モチベ):", mathlib.round(tM_term1), "因子(u,wの相性):", mathlib.round(tM_term2), "因子(w,sの相性):", mathlib.round(tM_term3), "因子(u,sの相性):", mathlib.round(tM_term4));
            const totalMotivation = mathlib.round(mathlib.adjust(
              tM_term1 + tM_term2 + tM_term3 + tM_term4
            ));
            //開始に必要なモチベーション
            const motiv_need_to_getStart = mathlib.round(
              mathlib.adjust(
                ((1 - user.featureOfStart) * 0.9)
                -
                ((0.25 - Math.abs(user.featureOfStart - selectedScheme.chemistry_featureOfStart))*0.4)
              )
            );
            //終了に必要なモチベーション
            const motiv_need_to_getItDone = mathlib.round(
              mathlib.adjust(
                ((1 - user.featureOfComplete) * 0.9)
                -
                ((0.25 - Math.abs(user.featureOfComplete - selectedScheme.chemistry_featureOfComplete))*0.4)
              )
            );
            user_h(user,'総合モチベーション：', totalMotivation);
            user_h(user,'開始に必要な総合モチベーション:', motiv_need_to_getStart);
            user_h(user,'終了に必要な総合モチベーション:', motiv_need_to_getItDone);
            // DBに登録
            await sim.changeMotivation(user, {
              totalMotivation: totalMotivation,
              motiv_need_to_getStart: motiv_need_to_getStart,
              motiv_need_to_getItDone: motiv_need_to_getItDone,
            });
            // モチベーションの上昇量
            let motiv_increase_val = 0;
            // やる気に対して，必要とされるやる気の閾値は”とりかかりの特性値”で決める
            if (totalMotivation <= motiv_need_to_getStart){ // ワークの難易度によって閾値が増減する
            // if (totalMotivation < mathlib.round(1 - user.featureOfStart + ワークの難易度)){
              user_h(user, '本日はサボりました...');
              await task.failed();
              motiv_increase_val += -0.01;
            }else{
              //　とりかかり成功
              motiv_increase_val += 0.02;
              // モチベーションを更新する
              await sim.changeMotivation(user, {
                motiv_increase_val: motiv_increase_val,
              }); 
              // task.open(task.start_time);
              await task.open(dayjs());
              user_h(user, user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'の予定[work:' + w.label + ']を' + dayjs().format('YYYY/MM/DD HH:mm:ss') + 'に開始しました．');

              user_h(user,'終了に必要な総合モチベーション:', motiv_need_to_getItDone);
              if(totalMotivation > motiv_need_to_getItDone){ // やりきる
                process.env['FAKETIME'] = "@" + dayjs(task.end_time).format('YYYY-MM-DD HH:mm:ss');
                // task.close(task.end_time);
                await task.close(dayjs());
                // console.log('           ', user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'の予定[work:' + w.label + ']を' + (process.env['FAKETIME']).split("@")[1] + 'に終了しました．');
                user_h(user, user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'の予定[work:' + w.label + ']を' + dayjs().format('YYYY/MM/DD HH:mm:ss') + 'に終了しました．');
                motiv_increase_val += 0.03;
              }else{
                user_h(user, 'やりきりませんでした...');
                await task.failed();
                motiv_increase_val += 0.02;
              }
            }
            // モチベーションを更新する
            await sim.changeMotivation(user, {
              motiv_increase_val: motiv_increase_val,
            }); 
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
    // await models.sequelize.close();
    const pid2 = parseInt(execSync("echo $PPID").toString());
    console.log("start.shの親, start.sh, node(PID):",argv.pid0, argv.pid1,pid2);
    // execSync(`nohup bash -c 'sleep 1 ; kill -9 ${argv.pid1} ${pid2}' &`);
    exec(`(sleep 1 ; kill -9 ${argv.pid1} ${pid2}) &`);
  }
  catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }

})();