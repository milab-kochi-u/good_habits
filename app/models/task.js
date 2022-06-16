'use strict';
module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    result: DataTypes.BOOLEAN,
    start_time: DataTypes.DATE,
    end_time: DataTypes.DATE,
    started_at: DataTypes.DATE,
    finished_at: DataTypes.DATE,
    canceled_at: DataTypes.DATE,
    source_task: DataTypes.INTEGER
  }, {});
  Task.associate = (models) => {
    // Task.belongsTo(models.Work_user,{as :'work_user', foreignKey: 'id'});
    Task.belongsTo(models.Work_user);
  };
  Task.prototype.getOwners = async function() {
    // prototype で this を使いたいのでアロー関数は使えない

  };
  Task.prototype.setOwnerTo = async function(user) {
    // prototype で this を使いたいのでアロー関数は使えない
    
  };
  return Task;
};
