const models = require('./models/index.js');
const yargs = require('yargs');
const fs = require('fs').promises;

(async() => {
    yargs
        .command('* <jsonfile>', '指定したダミーデータ JSON ファイルをシミュレーション用データベースに読み込みます。')
        .version().alias('v', 'version')
        .help().alias('h', 'help')
        .example(`$0 dummydata.json`);
    try {
        const argv = yargs.parseSync();
        const dummydata = JSON.parse(await fs.readFile(argv.jsonfile, 'utf8'));
        // 初期化（データベースを全て削除）
        await models.sequelize.sync({ force: true });
        // console.log(dummydata.users[0]);        

        console.log('Category 書き込み中...')
        const categories = [];
        for (const category of dummydata.categories) {
            categories.push(await models.Category.create({
                label: category.label,
                waveLength: category.waveLength,
                initialPhase: category.initialPhase,
            }));
        }

        console.log('User 書き込み中...')
        for (const user of dummydata.users) {
            const newUser = await models.User.create({
                name: user.name,
                waveLength: user.waveLength,
                initialPhase: user.initialPhase,
                startDays: user.startDays,
                initialMotivation: user.initialMotivation,
                intervalDaysForSelfReflection: user.intervalDaysForSelfReflection,
                thresholdOfWorkChanging: user.thresholdOfWorkChanging,
                thresholdOfSchemeChanging: user.thresholdOfSchemeChanging,
            });
            for (let n = 0; n < categories.length; n++) {
                await models.UsersCategoryPriority.create({
                    UserId: newUser.id,
                    CategoryId: categories[n].id,
                    priority: user.priorityOfCategory[n],
                });    
            }
        }

        console.log('Work 書き込み中...')
        for (const work of dummydata.works) {
            const newWork = await models.Work.create({
                label: work.label,
                waveLength: work.waveLength,
                initialPhase: work.initialPhase,
            });
            for (let n = 0; n < categories.length; n++) {
                await models.WorksCategoryPriority.create({
                    WorkId: newWork.id,
                    CategoryId: categories[n].id,
                    priority: work.priorityOfCategory[n],
                });    
            }
        }

        console.log('Scheme 書き込み中...')
        for (const scheme of dummydata.schemes) {
            const newScheme = await models.Scheme.create({
                label: scheme.label,
                waveLength: scheme.waveLength,
                initialPhase: scheme.initialPhase,
            });
            for (let n = 0; n < categories.length; n++) {
                await models.SchemesCategoryPriority.create({
                    SchemeId: newScheme.id,
                    CategoryId: categories[n].id,
                    priority: scheme.priorityOfCategory[n],
                });    
            }
        }

        console.log('ダミーデータの読み込み・書き込みが完了しました。')
    }
    catch (e) {
        console.error(`Error: ${e.message}`);
        process.exit(1);
    }
})();
