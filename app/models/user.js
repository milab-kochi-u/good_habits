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
  User.prototype.addScheme = async function({work:elm_work, scheme:elm_scheme}){
    const work_users = await this.getWork_users({
      where: {WorkId: elm_work.id, expiredAt: null}
    });
    let res = false;
    if (work_users.length >= 1){
      await work_users[0].addScheme(elm_scheme);
      res = true;
    }
    return res;
  };
  User.prototype.createTask = async function({
    work: elm_work,
    start_time: elm_start_time,
    end_time: elm_end_time
  }){
    const work_users = await this.getWork_users({
      where: {WorkId: elm_work.id, expiredAt: null}
    });
    const task = await work_users[0].createTask({
      start_time: elm_start_time,
      end_time: elm_end_time
    });
    return task;
  }
  return User;
};