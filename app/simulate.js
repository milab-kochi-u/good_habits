const models = require('./models/index.js');
const dayjs = require('dayjs');
const yargs = require('yargs');
const user = require('./models/user.js');
const { Op } = require("sequelize");
const mathlib = require('./mathlib.js');
const schemesWave = require('./models/schemesWave.js');

// userのモチベーションを指定値だけ増減させる（負の数も可能）
async function changeMotivation(user, val){
    // TODO: 別カラムに分ける
    const userMotivation = await models.UsersMotivation.findOne({
        where: { UserId: user.id},
        order: [ [ 'createdAt', 'DESC']],
    });
    const base = userMotivation.motivation;
    const res = (base + val) <= 0 ? 0 : mathlib.round(base + val);
    await user.createUsersMotivation({
        motivation: res,
    });
    console.log('       ', user.name, 'さんの基礎モチベーションが', base, 'から', res, 'に変更されます');
}

// a, b の day 日めの相性を調べる（相性度: 0〜1, 大きいほど相性が良い）
// TODO: 現在は日毎に計算しているのみであるが，日毎の値もDBに登録しておきたい．
function checkChemistry(a, b, day) {
	const aPhase = Math.sin(2 * Math.PI / (24 - a['waveLength']) * (day - a['initialPhase']));
	const bPhase = Math.sin(2 * Math.PI / (24 - b['waveLength']) * (day - b['initialPhase']));
    // console.log((a.name ? a.name : a.label), ' aPhase=', aPhase);
    // console.log((b.name ? b.name : b.label), ' bPhase=', bPhase);
	return 1.0 - Math.abs(aPhase - bPhase) / 2;
}

// Userと相性の良いWork,Schemeを返す
function getGoodWorS(user,all_WorS,passedDays){
    // TODO: ワークを決める際にカテゴリの相性を考慮する
    let maxChemistry = -1;
    let selectedWorS = null;
    for(let WorS of all_WorS){
        const chemistry = mathlib.round(checkChemistry(user,WorS,passedDays));
        if(chemistry > maxChemistry){
            selectedWorS = WorS;
            maxChemistry = chemistry;
        }
    }
    return selectedWorS;
}

// 期間内のタスク実施結果を返す
// 返り値: {"taskCount": 7, "successStart": 5, "successFinish": 4}
async function resultsOfTask(user, work, date, dayCount) {
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
        .version().alias('v', 'version')
        .help().alias('h', 'help')
        .example(`$0 --init 2020-01-01 --days 500`)
        .example(`$0 -d 3650`);
    try {
        // console.log('REALDATE:', dayjs().format('YYYY-MM-DD'));
        const argv = yargs.check(args => {
            if (args._.length != 0) throw new Error('不明な引数が指定されています');
            if ('init' in args) {
                if (!(dayjs(args.init).isValid())) throw new Error('日付の指定が正しくありません');
            }
            if (args.days === parseInt(args.days) && args.days > 0) return true;
            else throw new Error('日数の指定が正しくありません');
        }).parseSync();
        // console.log(argv);
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
        console.log('処理速度の計測を開始します．');
        let execT_start = performance.now();
        console.log('シミュレーションを開始します: ', dayjs().format('YYYY/MM/DD HH:mm:ss'));
        if (!simulationStartDate) simulationStartDate = dayjs(date);    // 過去のシミュレーションも含めた開始日
        const simulationFinishDate = date.add(argv.days-1, 'day');
        const simLog = await models.SimulationLog.create({
            startedAt: date,    // 今回のシミュレーションの開始日
            // finishedAt: simulationFinishDate,    // シミュレーション終了日（実際のシミュレーション終了時に更新する）
        });
        console.log('simulationStartDate:', simulationStartDate.format('YYYY/MM/DD'));
        console.log('simulationFinishDate:', simulationFinishDate.format('YYYY/MM/DD'));

        const users = await models.User.findAll();
        const works = await models.Work.findAll();
        const schemes = await models.Scheme.findAll();

        // reschedule test -----
        // let cnt = 0;

        // reschedule test -----
        for (let day = 0; day < argv.days; day++) {
            // 以降，FAKETIME で日付を騙す
            process.env['FAKETIME'] = "@" + date.format('YYYY-MM-DD HH:mm:ss');

            console.log(day+1, '日目:', date.format('YYYY/MM/DD HH:mm'));
            const passedDays = date.diff(simulationStartDate, 'day');
            console.log('  シミュレーション開始から', passedDays, '日経過');

            // workの波をテーブルに登録
            for(let work of works){
                const worksWaveValue = mathlib.round(Math.sin(2 * Math.PI / (24 - work['waveLength']) * (day - work['initialPhase'])));
                await work.createWorksWave({
                    value: worksWaveValue,
                    date: date.format('YYYY.MM.DD'),
                });
            }
            // schemeの波をテーブルに登録
            for(let scheme of schemes){
                const schemesWaveValue = mathlib.round(Math.sin(2 * Math.PI / (24 - scheme['waveLength']) * (day - scheme['initialPhase'])));
                await scheme.createSchemesWave({
                    value: schemesWaveValue,
                    date: date.format('YYYY.MM.DD'),
                });
            }

            for (let user of users) {
                if (user.startDays > day+1) continue;  // まだ利用を始めていない
                let addedWorks = await user.getWorks();
                // userの波をテーブルに登録
                const usersWaveValue = mathlib.round(Math.sin(2 * Math.PI / (24 - user['waveLength']) * (day - user['initialPhase'])));
                await user.createUsersWave({
                    value: usersWaveValue,
                    date: date.format('YYYY.MM.DD'),
                });
                console.log(user.name, 'の本日の波：', usersWaveValue);

                // ワークが未決定なら決定する
                if (addedWorks.length < 1) {
                    console.log('    ', user.name, 'が利用開始します');
                    const UMlength = (await user.getUsersMotivations()).length;
                    if(UMlength == 0){
                        await user.createUsersMotivation({
                            motivation: user.initialMotivation,
                        });
                    }
                    let selectedWork = getGoodWorS(user,works,passedDays);
                    console.log('       ', user.name, 'は', selectedWork.label, 'を継続させたいワークに設定します');
                    await user.addWork(selectedWork);

                    // 工夫を決める
                    let selectedScheme = getGoodWorS(user,schemes,passedDays);
                    console.log('       ', user.name, 'は工夫「',selectedScheme.label,'」を採用します．');
                    await user.addScheme({work: selectedWork, scheme: selectedScheme});
                    addedWorks = await user.getWorks();
                }

                await changeMotivation(user,-0.01); //やる気が0.01減る
                
                // 次の振り返り日を決める

                let nextSelfReflected = dayjs(date).subtract(1, 'day');
                if (user.lastSelfReflectedAt !== null && dayjs(user.lastSelfReflectedAt).isValid()) {
                    nextSelfReflected = dayjs(user.lastSelfReflectedAt).add(user.intervalDaysForSelfReflection, 'day');
                }

                // 予定の振り返り（タスク登録
                if (nextSelfReflected.diff(date, 'day') < 1) {
                    console.log('        ', user.name, 'が振り返ります');

                    // TODO: ワークを変更するかを検討し，変更する場合は変更できるようにする
                    // TODO: 複数のワークを設定できるようにする

                    // TODO: 複数の工夫を設定できるようにする
                    // TODO: 時間もまばらにする（全部19:00になってる）
                    for (addedWork of addedWorks) {
                        // TODO: 今までの履歴も振り返る
                        // TODO: 実施率を見て工夫を変えるかどうか選択する
                        const history = await resultsOfTask(user,addedWork, date, 7);
                        console.log('        ', user.name, 'さんの予定実施結果:', history);
                        const efficacy_rate = history['successFinish'] / history['taskCount'];
                        console.log('実施率：', new Intl.NumberFormat('ja',{style: 'percent'}).format(efficacy_rate));
                        if(!isNaN(efficacy_rate) && efficacy_rate < 0.5){
                            // 工夫を選び直す
                            let selectedScheme = getGoodWorS(user,schemes,passedDays);
                            console.log('        ', user.name, 'さんは工夫を「', selectedScheme.label, '」に変更しました．');
                            await user.changeScheme({work:addedWork,scheme:selectedScheme});
                        }
                        for (let d = 0; d < user.intervalDaysForSelfReflection; d++) {
                            // TODO: 予定を立てられるようにする
                            const chemistry = mathlib.round(checkChemistry(user, addedWork, passedDays));
                            if (chemistry < 0.1) continue;  // (仮) 0.1未満なら予定を立てない
                            const task = await user.createTask({
                                work: addedWork,
                                start_time : dayjs(date).add(d, 'day').add(19, 'hour'), // (仮) 常に19時〜20時の予定とする
                                end_time : dayjs(date).add(d, 'day').add(20, 'hour'),
                            });
                            console.log('         ', user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'に', addedWork.label, 'を実施する予定を立てました');
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
                        // TODO: initialMotivationを別テーブルで分けて動的にしたい
                        const currentMotivation = (await models.UsersMotivation.findOne({
                            where: { UserId: user.id},
                            order: [[ 'createdAt', 'DESC']],
                        })).motivation;
                        const wheterDo = mathlib.round(currentMotivation*0.5 +  checkChemistry(user,w,passedDays)*0.25 + checkChemistry(user, selectedScheme,passedDays)*0.25);
                        // let wheterDo = checkChemistry(user, w, passedDays);
                        console.log('           ',user.name, 'さんの本日の総合モチベーション：', wheterDo, '    開始に必要な総合モチベーション:', mathlib.round(1-user.featureOfStart));

                        // やる気に対して，必要とされるやる気の閾値は”とりかかりの特性値”で決める
                        if (wheterDo < mathlib.round(1 - user.featureOfStart)){ // ワークの難易度によって閾値が増減する
                        // if (wheterDo < mathlib.round(1 - user.featureOfStart + ワークの難易度)){
                            console.log('           ', '本日はサボりました...');
                        }else{
                            //　とりかかり成功
                            // task.open(task.start_time);
                            task.open(dayjs());
                            console.log('           ', user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'の予定[work:' + w.label + ']を' + dayjs().format('YYYY/MM/DD HH:mm:ss') + 'に開始しました．');

                            console.log('           終了に必要な総合モチベーション:', mathlib.round(1-user.featureOfComplete));
                            if(wheterDo > mathlib.round(1 - user.featureOfComplete)){ // やりきる
                                process.env['FAKETIME'] = "@" + dayjs(task.end_time).format('YYYY-MM-DD HH:mm:ss');
                                // task.close(task.end_time);
                                task.close(dayjs());
                                // console.log('           ', user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'の予定[work:' + w.label + ']を' + (process.env['FAKETIME']).split("@")[1] + 'に終了しました．');
                                console.log('           ', user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'の予定[work:' + w.label + ']を' + dayjs().format('YYYY/MM/DD HH:mm:ss') + 'に終了しました．');
                                await changeMotivation(user, 0.01); // やる気が0.01上がる

                            }else{
                                console.log('           ', 'やりきりませんでした...');
                            }
                        }
                    }
                }
                // 時間を元に戻す
                process.env['FAKETIME'] = "@" + date.format('YYYY-MM-DD HH:mm:ss');
                
            }
            date = date.add(1, 'day');  // 1日進める
        }

        // ----シミュレーション終了，分析結果----
        console.log('--------------------------------------------');
        console.log('シミュレーションが終了しました，分析結果を表示します．');
        for(let user of users){
            console.log('--------', 'UserName:' + user.name, '--------');
            console.log('user.featureOfStart:', user.featureOfStart);
            console.log('user.featureOfComplete:', user.featureOfComplete);
            const myWs = await user.getWorks();
            for(let work of myWs){
                console.log('WorkLabel:', work.label);
                console.log('result('+argv.days+'days)\n', await resultsOfTask(user, work, date, argv.days));
            }
        }
        console.log('--------------------------------------------');
        delete process.env.FAKETIME;
        console.log('シミュレーションを完了しました: ', dayjs().format('YYYY/MM/DD HH:mm:ss'));
        simLog.finishedAt = simulationFinishDate;
        simLog.save();

        let execT_end = performance.now();
        console.log('処理時間：', mathlib.round((execT_end - execT_start) / 1000,2), '秒');
    }
    catch (e) {
        console.error(`Error: ${e.message}`);
        process.exit(1);
    }

})();
