const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const recommend_server_url = 'http://recommend-server';
const filename_example = 'days300users50_v0_0_1_2023_11_30.sqlite3';
const dataroots = ['/app/backups', '/app'];

async function recommend(filename, user_id, work_id, model){
  const url = `${recommend_server_url}/recommend/users/${user_id}/works/${work_id}`;
  filename = (typeof filename ==='undefined') ? filename_example : filename;
  filepathes = [`${dataroots[0]}/${filename}`, `${dataroots[1]}/${filename}`];
  for(let i of filepathes){
    if(fs.existsSync(i)){
      const data = fs.readFileSync(i);
      const form = new FormData();
      form.append('input_file', data, filename);
      try{
        const res = (typeof model === 'undefined') ? await axios.post(url,form) : await axios.post(`${url}?model=${model}`, form);
        return res.data;
      }catch(error){
        throw error;
      }
    }
  }
  throw new Error('指定されたファイルが存在しません');
}

async function get_rec_log(user_id,work_id,sim_date){
  const url = `${recommend_server_url}/getLog/users/${user_id}/works/${work_id}?sim_date=${sim_date}`;
  return (await axios.get(url)).data;
}


module.exports = {recommend, get_rec_log};