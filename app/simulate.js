const models = require('./models/index.js');
const dayjs = require('dayjs');
const yargs = require('yargs');
const user = require('./models/user.js');
const numberOfSignificantDigits = 2;    // 有効桁数

// 有効数字に丸める
function round(num, digits = numberOfSignificantDigits) {
	return Number.parseFloat(num.toFixed(digits));
}

// a, b の day 日めの相性を調べる（相性度: 0〜1, 大きいほど相性が良い）
// TODO: 現在は日毎に計算しているのみであるが，日毎の値もDBに登録しておきたい．
function checkChemistry(a, b, day) {
	const aPhase = Math.sin(Math.PI * 2 * (day / (24 - a['waveLength'])) - a['initialPhase']);
	const bPhase = Math.sin(Math.PI * 2 * (day / (24 - b['waveLength'])) - b['initialPhase']);
    // console.log((a.name ? a.name : a.label), ' aPhase=', aPhase);
    // console.log((b.name ? b.name : b.label), ' bPhase=', bPhase);
	return 1.0 - Math.abs(aPhase - bPhase) / 2;
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
            process.env['FAKETIME'] = date.format('YYYY-MM-DD HH:mm:ss');

            console.log(day+1, '日目:', date.format('YYYY/MM/DD HH:mm'));
            const passedDays = date.diff(simulationStartDate, 'day');
            console.log('  シミュレーション開始から', passedDays, '日経過');

            for (let user of users) {
                if (user.startDays > passedDays) continue;  // まだ利用を始めていない
                let addedWorks = await user.getWorks();

                // ワークが未決定なら決定する
                if (addedWorks.length < 1) {
                    console.log('    ', user.name, 'が利用開始します');
                    let maxChemistry = -1;
                    let selectedWork = null;
                    for (let work of works) {
                        // TODO: ワークを決める際にカテゴリの相性を考慮する
                        const chemistry = round(checkChemistry(user, work, passedDays));
                        if (chemistry > maxChemistry) {
                            selectedWork = work;
                            maxChemistry = chemistry;
                        }
                    }
                    console.log('       ', user.name, 'は', selectedWork.label, 'を継続させたいワークに設定します');
                    await user.addWork(selectedWork);
                    addedWorks = await user.getWorks();
                    maxChemistry = -1;
                    let selectedScheme = null;
                    // 工夫を決める
                    for(let scheme of schemes){
                        const chemistry = round(checkChemistry(selectedWork,scheme,passedDays));
                        if(chemistry > maxChemistry){
                            selectedScheme = scheme;
                            maxChemistry = chemistry;
                        }
                    }
                    console.log('       ', user.name, 'は工夫「',selectedScheme.label,'」を採用します．');
                    await user.addScheme({work: selectedWork, scheme: selectedScheme});
                }


                // TODO: 予定の実施結果を記録できるようにする

                // 次の振り返り日を決める

                let nextSelfReflected = dayjs(date).subtract(1, 'day');
                if (user.lastSelfReflectedAt !== null && dayjs(user.lastSelfReflectedAt).isValid()) {
                    nextSelfReflected = dayjs(user.lastSelfReflectedAt).add(user.intervalDaysForSelfReflection, 'day');
                }

                // 予定の振り返り（タスク登録）
                if (nextSelfReflected.diff(date, 'day') < 1) {
                    console.log('        ', user.name, 'が振り返ります');
                    // TODO: ワークを変更するかを検討し，変更する場合は変更できるようにする
                    // TODO: 複数のワークを設定できるようにする
                    // TODO: 工夫を変更するかを検討し，変更する場合は変更できるようにする
                    // TODO: 複数の工夫を設定できるようにする
                    // TODO: 時間もまばらにする（全部19:00になってる）
                    for (addedWork of addedWorks) {
                        for (let d = 0; d < user.intervalDaysForSelfReflection; d++) {
                            // TODO: 予定を立てられるようにする
                            const chemistry = round(checkChemistry(user, addedWork, passedDays));
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
                        // TODO : もっと現実性を持たせる　（実施できなかったとか）
                        process.env['FAKETIME'] = dayjs(task.start_time).format('YYYY-MM-DD HH:mm:ss');

                        // 当日にユーザがタスクを実施するかどうかを決める
                        let wheterDo = checkChemistry(user,w,passedDays);
                        console.log('           ',user.name, 'さんの本日のやる気：', wheterDo);
                        if (wheterDo <= 0.5){
                            console.log('           ', '本日はサボりました...');
                        }else{
                            task.open(task.start_time);
                            console.log('           ', user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'の予定[work:' + w.label + ']を' + process.env['FAKETIME'] + 'に開始しました．');

                            process.env['FAKETIME'] = dayjs(task.end_time).format('YYYY-MM-DD HH:mm:ss');
                            task.close(task.end_time);
                            console.log('           ', user.name, 'が', dayjs(task.start_time).format('YYYY/MM/DD HH:mm'), 'の予定[work:' + w.label + ']を' + process.env['FAKETIME'] + 'に終了しました．');
                        }
                    }
                }
                // 時間を元に戻す
                process.env['FAKETIME'] = date.format('YYYY-MM-DD HH:mm:ss');
                
            }
            date = date.add(1, 'day');  // 1日進める
        }

        delete process.env.FAKETIME;
        console.log('シミュレーションを完了しました: ', dayjs().format('YYYY/MM/DD HH:mm:ss'));
        simLog.finishedAt = simulationFinishDate;
        simLog.save();
    }
    catch (e) {
        console.error(`Error: ${e.message}`);
        process.exit(1);
    }

})();
