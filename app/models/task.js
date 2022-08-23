'use strict';
const dayjs = require('dayjs');
module.exports = (sequelize, DataTypes) => {
  
  // タスク（実施予定，実施結果の記録）
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
  });

  Task.associate = (models) => {
    Task.belongsTo(models.UsersWork);
  };

  Task.prototype.reschedule = async function(newStartTime, newEndTime) {
    const sourceId = this.id;
    const sourceUsersWorkId = this.UsersWorkId;
    delete this.id;
    const newTask = await Task.create(this);
    newTask.UsersWorkId = sourceUsersWorkId;
    newTask.source_task = sourceId;
    newTask.start_time = newStartTime;
    newTask.end_time = newEndTime;
    await newTask.save();
    await this.destroy();
    return newTask;
  }

  // タスクの開始
  Task.prototype.open = async function(started_at){
    this.started_at = started_at;
    await this.save();
  }
  // タスクの終了
  Task.prototype.close = async function(finished_at){
    this.finished_at = finished_at;
    await this.save();
  }

  return Task;
};
