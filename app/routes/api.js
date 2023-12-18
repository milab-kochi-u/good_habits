var express = require('express');
var router = express.Router();
var models = require('../models/index.js');
const { exec } = require('child_process');
// 2023.12.18 Express.js ファイルアップロード (multer 編) https://qiita.com/tadnakam/items/d21d014e09cfa98437a8
const fs = require('fs');
const multer = require('multer');
const updir = "/tmp";
const upload = multer({dest:updir}).single('file');


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

// 2023.12.18 Express.js ファイルアップロード (multer 編) https://qiita.com/tadnakam/items/d21d014e09cfa98437a8
router.post('/upload_single', (req, res) => {
  upload(req,res,function(err){
    if(err instanceof multer.MulterError){
      console.log(err);
      res.status(415).send("multer ERR!");
      return;
    }else if(err){
      console.log(err);
      res.status(415).send("other ERR!");
      return;
    }
    const path = req.file.path.replace(/\\/g, "/");
    if (path) {
      const dest = updir + "/" + req.file.originalname;
      fs.renameSync(path, dest);  // 長い一時ファイル名を元のファイル名にリネームする。
      res.status(200).send(`${dest} にアップロードされました。`);
    }
    else {
      res.send("エラー：アップロードできませんでした。");
    }
  });
});

module.exports = router;
