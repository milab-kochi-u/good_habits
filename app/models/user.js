'use strict';
module.exports = (sequelize, DataTypes) => {
  // ユーザ
  const User = sequelize.define('User', {
    name: DataTypes.STRING,
  }, {});
  User.associate = (models) => {
    User.belongsToMany(models.Work, { through: { model: models.UsersWork } });
    User.hasMany(models.UsersWork);
  };

  User.prototype.addScheme = async function({ work, scheme }) {
    const myWorks = await this.getUsersWorks({
      where: { WorkId: work.id }
    });
    if (myWorks.length == 1) {
      await myWorks[0].addScheme(scheme);
      return true;
    }
    return false;
  };

  User.prototype.createTask = async function({ work, start_time, end_time }) {
    const myWorks = await this.getUsersWorks({
      where: { WorkId: work.id }
    });
    if (myWorks.length != 1) return null;
    const task = await myWorks[0].createTask({
      start_time: start_time,
      end_time: end_time
    });
    return task;
  }

  User.prototype.getTasks = async function(work) {
    const myWorks = await this.getUsersWorks({
      where: { WorkId: work.id },
    });
    if (myWorks.length != 1) return null;
    return await myWorks[0].getTasks({
      include: { all: true, nested: true }
    });
  }
  
  return User;
};