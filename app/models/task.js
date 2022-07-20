'use strict';
const dayjs = require('dayjs');
module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    result:{
      type: DataTypes.BOOLEAN,
      defaultValue: null
    },
    start_time: DataTypes.DATE,
    end_time: DataTypes.DATE,
    started_at: DataTypes.DATE,
    finished_at: DataTypes.DATE,
    source_task: DataTypes.INTEGER
  }, {
    paranoid: true,
    deletedAt: 'canceledAt'
  });
  Task.associate = (models) => {
    Task.belongsTo(models.Work_user);
    Task.models = models;
  };
  Task.prototype.start = async function(){
    this.started_at = dayjs();
    await this.save();
  }
  Task.prototype.finish = async function({result=null}){
    this.finished_at = dayjs();
    this.result = result;
    await this.save();
  }
  // Task.prototype.close = async function({result,started_at,finished_at}){
  //   this.result = result;
  //   this.started_at = started_at;
  //   this.finished_at = finished_at;
  //   await this.save();
  // }

  Task.prototype.delete = async function(){
    this.destroy();
  }
  Task.prototype.change = async function({
    new_start_time,
    new_end_time
  }){
    const prev_id = this.id;
    const work_user_id = this.WorkUserId;
    this.destroy();
    Task.create({
      WorkUserId:work_user_id,
      start_time:new_start_time,
      end_time:new_end_time,
      source_task:prev_id
    });
  }
  return Task;
};
