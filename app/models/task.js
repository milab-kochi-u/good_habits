'use strict';
module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    result: DataTypes.BOOLEAN,
    start_time: DataTypes.DATE,
    end_time: DataTypes.DATE
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
