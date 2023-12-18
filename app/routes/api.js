var express = require('express');
var router = express.Router();
var models = require('../models/index.js');
const { exec } = require('child_process');

// 2023.12.18 Express.js ファイルアップロード (multer 編) https://qiita.com/tadnakam/items/d21d014e09cfa98437a8
const fs = require('fs');
const multer = require('multer');
const updir = "/tmp/sqlites";
const upload = multer({dest:updir}).single('sqlite');

const path = require('path');

/* API routes */
router.get('/simulate', async function(req, res, next){
  var resMsg = "";
  await exec('./start.sh -h', (err, stdout, stderr) => {
    if(err){
      res.status(409).send('[ERROR]既に起動されています．時間を空けて再度リクエストしてください．');
    }else{
      res.send(`stdout: ${stdout}`);
    }
  });
});

// /temp/sqlitesにある最新ファイル２件を返す
router.get('/getFiles', function(req,res,next){
  const files = fs.readdirSync(updir);
  if(files.length == 0){return res.send([]);}
  if(files.length == 1){return res.send([files[0]]);}
  files.sort((a,b) =>{
    const at = fs.statSync(`${updir}/${a}`)
    const bt = fs.statSync(`${updir}/${b}`)
    return bt.mtime - at.mtime;
  });
  return res.send([files[0],files[1]]);
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
    fs.writeFile('.env', `SQLITE_PATH=/tmp/sqlites/${req.body.file}`, (err)=>{
      if(err) throw err;
      console.log('ok!');
    });
  }else{
    fs.writeFile('.env', ``, (err)=>{
      if(err) throw err;
      console.log('ok!');
    });
  }
  return res.send('ok');
});

// 2023.12.18 Express.js ファイルアップロード (multer 編) https://qiita.com/tadnakam/items/d21d014e09cfa98437a8
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

module.exports = router;
