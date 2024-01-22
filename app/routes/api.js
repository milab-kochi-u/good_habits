var express = require('express');
var router = express.Router();
const models = require('../models/index.js');
const { execSync, exec } = require('child_process');
const {get_rec_log} = require('../util/manageapi.js');

// 2023.12.18 Express.js ファイルアップロード (multer 編) https://qiita.com/tadnakam/items/d21d014e09cfa98437a8
const fs = require('fs');
const multer = require('multer');
const updir = "/tmp/sqlites";
const upload = multer({dest:updir}).single('sqlite');
const uploads = multer({dest:updir}).array('files');

const path = require('path');

/* API routes */
router.post('/simulate', async function(req, res, next){
  await exec(req.body.query , { maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
    if(err && err.code == 1) return res.status(409).send('[ERROR]既に起動されています．時間を空けて再度リクエストしてください．');
    return res.send("ok");
  });
});
// sim_result.logの進捗が分かるinfo情報 の tail -n 1　を返します
router.get('/simulate/getResultsTail', async function(req,res,next){
  const text = fs.readFileSync("/app/sim_result.log", {encoding:'utf-8'});
  const arr = text.split(/\r\n|\n/);
  const resdata = arr.filter(row =>{
    if(row.indexOf(`  シミュレーション開始から`) > -1) return true;
  });
  return res.send(resdata.slice(-1)[0]);
});

// /temp/sqlitesにある最新ファイル２件を返す
router.get('/getFiles', function(req,res,next){
  const files = fs.readdirSync(updir);
  const sqlites = files.filter(file => {
    return path.extname(file).toLowerCase() === ".sqlite3";
  });
  const logs = files.filter(file => {
    return path.extname(file).toLowerCase() === ".log";
  });

  if(sqlites.length == 0){return res.send([]);}
  const sortfn = (a,b) =>{
    const at = fs.statSync(`${updir}/${a}`)
    const bt = fs.statSync(`${updir}/${b}`)
    return bt.mtime - at.mtime;
  }
  try{
    sqlites.sort(sortfn);
    logs.sort(sortfn);
    // console.log("sorted sqlites:",sqlites);
    // console.log("sorted logs:",logs);
    const file1 = sqlites[0];
    const file2 = sqlites.length >= 2 ? sqlites[1] : null;
    let log1, log2;
    let same1 = file1 ? logs.filter(log=>{
      return path.basename(file1,".sqlite3") === path.basename(log,".log");
    })[0] : null;
    let same2 = file2 ? logs.filter(log=>{
      return path.basename(file2,".sqlite3") === path.basename(log,".log");
    })[0] : null;
    log1 = same1 ? same1 : null;
    log2 = same2 ? same2 : null;
    return res.send([file1,file2, log1, log2]);
  }catch(err){
    console.log(err);
    return res.status(415).send("error");
  }
});

// userごとの/app/sim_result.log (又は/tmp/sqlites/[req.query.dbの.log版])を返す
router.get('/getLogFile/user/:id', async function(req,res,next){
  let text;
  if(req.query.db === "sqlite-default"){
    text = fs.readFileSync("/app/sim_result.log", {encoding:'utf-8'});
  }else{
    let _p = `/tmp/sqlites/${path.basename(req.query.db,".sqlite3")}.log`;
    if(fs.existsSync(_p)){
      text = fs.readFileSync(_p, {encoding:'utf-8'});
    }else{
      // ファイルが存在しない
      return res.send([]);
    }
  }
  const arr = text.split(/\r\n|\n/);
  const resdata = arr.filter(row =>{
    if(row.indexOf(`][user_${req.params.id}]:`) > -1 || row.indexOf(`][info]:`) > -1) return true;
  });
  res.send(resdata);
  return;
});

router.get('/getRecLogFile/user/:id/work/:wid', async function(req,res,next){
  const resdata = await get_rec_log(req.params.id,req.params.wid, req.query.sim_date);
  res.send(resdata);
  return;
});

router.get('/getDBstate', function(req,res,next){
  if(process.env['SQLITE_PATH']){
    return res.send(path.basename(process.env.SQLITE_PATH));
  }else{
    return res.send('0');
  }
});

router.post('/changeDB', function(req,res,next){
  models.sequelize.close();
  if(req.body.file != 'sqlite-default'){
    fs.writeFile('/tmp/.env', `SQLITE_PATH=/tmp/sqlites/${req.body.file}`, (err)=>{
      if(err) throw err;
      console.log('ok!');
    });
  }else{
    fs.writeFile('/tmp/.env', ``, (err)=>{
      if(err) throw err;
      console.log('ok!');
    });
  }
  return res.send('ok');
});

// 2023.12.18 Express.js ファイルアップロード (multer 編) https://qiita.com/tadnakam/items/d21d014e09cfa98437a8
// 単一ファイルアップロードから複数ファイルアップロードに変更したので
// もう使わない（一応残す）
router.post('/upload_single', (req, res) => {
  upload(req,res,function(err){
    if(err instanceof multer.MulterError){
      console.log(err);
      return res.status(415).send("multer ERR!");
    }else if(err){
      console.log(err);
      return res.status(415).send("other ERR!");
    }
    // const path = req.file.path.replace(/\\/g, "/");
    const path = req.file.path.replace(/\\/g, "/");
    if (path) {
      const dest = updir + "/" + req.file.originalname;
      fs.renameSync(path, dest);  // 長い一時ファイル名を元のファイル名にリネームする。
      return res.status(200).send(`${dest} にアップロードされました。`);
    }
    else {
      return res.send("エラー：アップロードできませんでした。");
    }
  });
});

router.post('/uploads', (req, res) => {
  uploads(req,res,function(err){
    if(err instanceof multer.MulterError){
      console.log(err);
      return res.status(415).send("multer ERR!");
    }else if(err){
      console.log(err);
      return res.status(415).send("other ERR!");
    }
    if(!req.files[0]){
      return res.status(415).send("アップロードできませんでした．");
    }
    let resmsg=[];
    req.files.forEach(file=>{
      const path = file.path.replace(/\\/g, "/");
      const dest = updir + "/" + file.originalname;
      resmsg.push(dest);
      fs.renameSync(path, dest);  // 長い一時ファイル名を元のファイル名にリネームする。
    });
    return res.status(200).send(`${resmsg} にアップロードされました。`);
  });
});

module.exports = router;
