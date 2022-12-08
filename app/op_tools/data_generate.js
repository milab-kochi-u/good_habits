const fs = require("fs");

// import parse from 'csv-parse/sync';
const {parse} = require('csv-parse/sync');
const {stringify} = require('csv-stringify/sync');

const users = fs.readFileSync(__dirname + '/tmp_users.csv', {encoding: 'utf-8'});
const works = fs.readFileSync(__dirname + '/tmp_works.csv', {encoding: 'utf-8'});
const schemes = fs.readFileSync(__dirname + '/tmp_schemes.csv', {encoding: 'utf-8'});

const parsedData = parse(users, {columns: true});
// const parsedData = parse(users, {columns: false});
console.log(parsedData);
parsedData.forEach((row) => {
  console.log(row['name']);
});
for(i=0;i<100;i++){
  data = 'user' + ('000' + i).slice(-3);
  parsedData.push({'name': data});
}
const output = stringify(parsedData,{header: true});
fs.writeFileSync(__dirname+'/output.csv', output, {encoding: 'utf-8'});
// parsedData.push({})