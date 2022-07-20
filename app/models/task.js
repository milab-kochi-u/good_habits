'use strict';
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

  return Task;
};
