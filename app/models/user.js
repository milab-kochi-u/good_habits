'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
      name: DataTypes.STRING,
  }, {});
  User.associate = (models) => {
    User.belongsToMany(models.Work,{through: {model: models.Work_user, unique: false}});
    User.hasMany(models.Work_user);
    User.models = models;
  };
  User.prototype.addScheme = async function({
    work,
    scheme
  }){
    const work_users = await this.getWork_users({
      where: {WorkId: work.id, expiredAt: null}
    });
    let res = false;
    if (work_users.length >= 1){
      await work_users[0].addScheme(scheme);
      res = true;
    }
    return res;
  };
  User.prototype.createTask = async function({
    work,
    start_time,
    end_time,
  }){
    const work_users = await this.getWork_users({
      where: {WorkId: work.id, expiredAt: null}
    });
    const task = await work_users[0].createTask({
      start_time: start_time,
      end_time: end_time
    });
    return task;
  }
  return User;
};