'use strict';
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
    canceled_at: DataTypes.DATE,
    source_task: DataTypes.INTEGER
  }, {});
  Task.associate = (models) => {
    Task.belongsTo(models.Work_user);
    Task.models = models;
  };
  Task.prototype.close = async function({
    result: elm_result,
    started_at: elm_started_at,
    finished_at: elm_finished_at
  }){
    this.result = elm_result;
    this.started_at = elm_started_at;
    this.finished_at = elm_finished_at;
    await this.save();
  }
  Task.prototype.delete = async function(canceled_at){
    this.canceled_at = canceled_at;
    await this.save();
  }
  Task.prototype.change = async function(canceled_at,params){
    const work = params.work;
    const start_time = params.start_time;
    const end_time = params.end_time;
  }
  return Task;
};
