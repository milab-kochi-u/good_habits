const models = require('./models/index.js');
const dayjs = require('dayjs');
const { execSync } = require('child_process');
const User = models.User;
const Work = models.Work;
const Scheme = models.Scheme;

(async() => {
    // 初期化
    await models.sequelize.sync({force: true });
    // ユーザの登録
    const user1 = await User.create({
        name: 'Taro',
    });
    const user2 = await User.create({
        name: 'Tom',
    });
    const user3 = await User.create({
        name: 'Mike',
    });

    // ワークの登録
    const work1 = await Work.create({
        work: '筋トレ',
    });
    const work2 = await Work.create({
        work: 'ダイエット',
    });
    const work3 = await Work.create({
        work: '英語学習',
    });

    // 工夫の登録
    const scheme1 = await Scheme.create({
        scheme: '教科書A',
    });
    const scheme2 = await Scheme.create({
        scheme: '図書館',
    });
    const scheme3 = await Scheme.create({
        scheme: '音楽',
    });
    const scheme4 = await Scheme.create({
        scheme: '教科書B',
    });
    const scheme5 = await Scheme.create({
        scheme: 'ダンベル',
    });

    /* scenario1 
        「太郎」は中学2年生．受験対策に向け，苦手な英語を理解したいと思っている．
        ワーク「英語学習」を2020年1月1日に登録し，3年生の夏(2020年8月)あたりまで
        このアプリを使い頑張って英語学習に励もうとしている．
    */
    const Taro = await User.findOne({ where: { id: 1}});
    const Learn_English = await Work.findOne({ where: { id: 3}});

    await models.sequelize.sync();
    console.log("-----", process.env, "----");
    console.log("----", dayjs().format('YYYY-MM-DD HH:mm:ss'), "----");
    await Taro.addWork(Learn_English);

    process.env['FAKETIME'] = dayjs().add(1,'m').format('YYYY-MM-DD HH:mm:ss');
    console.log("----", dayjs().format('YYYY-MM-DD HH:mm:ss'), "----");

    // ユーザ「太郎」がワーク「英語学習」を追加した．
    await Taro.addWork(Learn_English);

    // ユーザ「太郎」がワーク「英語学習」に工夫「教科書A」を登録した．
    await Taro.addScheme({
        work:Learn_English,
        scheme:await Scheme.findOne({where:{id:1}})
    });
    // ユーザ「太郎」がワーク「英語学習」のタスクを10分後に実施しようと考えた
    const task = await Taro.createTask({
        work : Learn_English,
        start_time : dayjs().add(10,'m'),
        end_time : dayjs().add(1,'h').add(10,'m')
    });
    await task.close({
        result: true,
        started_at: dayjs().add(12,'m'),
        finished_at: dayjs().add(1,'h').add(13,'m')
    });

    process.env['FAKETIME'] = dayjs().add(1,'d').minute(0).format('YYYY-MM-DD HH:mm:ss');
    console.log("----", dayjs().format('YYYY-MM-DD HH:mm:ss'), "----");

    // ワークのキャンセル
    const t_temp = await Taro.createTask({
        work: Learn_English,
        start_time: dayjs().add(20,'m'),
        end_time: dayjs().add(1,'h').add(50,'m')
    });

    process.env['FAKETIME'] = dayjs().add(15,'m').format('YYYY-MM-DD HH:mm:ss');
    console.log("----", dayjs().format('YYYY-MM-DD HH:mm:ss'), "----");

    t_temp.delete({});
    
    // data1[0].destroy({through : {expiredAt: '2022/03/01 00:00'}});
    // await Taro.addWork(work3, {through : {expiredAt: '2020/03/01 00:00'}});
    
    // const data2 = await user1.createWork({work:'資格勉強', createdAt: '2020/02/01 00:00'});

    // console.log(data1[0].constructor.name);
    // data1[0].expiredAt = '2020/02/02 00:00';
    // await data1[0].save();
    // data1[0].expiredAt = '2020/02/03 00:00';
    // await data1[0].save();
})();