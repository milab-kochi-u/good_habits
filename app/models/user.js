'use strict';
module.exports = (sequelize, DataTypes) => {

  // ユーザ
  const User = sequelize.define('User', {
    name: DataTypes.STRING,
    waveLength: DataTypes.INTEGER,
    initialPhase: DataTypes.INTEGER,
    startDays: DataTypes.INTEGER, // 何日目から利用を始めるか
    initialMotivation: DataTypes.FLOAT,
    intervalDaysForSelfReflection: DataTypes.INTEGER,
    lastSelfReflectedAt: DataTypes.DATE,  // 最後に振り返りを行った日付
    thresholdOfWorkChanging: DataTypes.FLOAT,
    thresholdOfSchemeChanging: DataTypes.FLOAT,
  }, {
    timestamps: false
  });

  User.associate = (models) => {
    User.belongsToMany(models.Category, { through: { model: models.UsersCategoryPriority } });
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