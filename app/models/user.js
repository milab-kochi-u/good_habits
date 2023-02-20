'use strict';

const e = require("express");

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

  User.prototype.getCurrentSchemes = async function({work}){
    const myUW = await this.getUsersWorks({
      where: { WorkId: work.id}
    }) ;
    if(myUW.length != 1) return null;
    const mySchemes = await myUW[0].getSchemes();
    return mySchemes;
  }
  
  // schemeの変更
  User.prototype.changeScheme = async function({work, scheme}){
    const myUW = await this.getUsersWorks({
      where: {WorkId: work.id}
    });
    if(myUW.length != 1) return null;
    // 前のschemeを削除
    (await myUW[0].getUsersSchemes()).forEach(async US => {
      console.log('deleting UsersScheme.id:', US.id)
      await US.destroy();
    });
    console.log('adding scheme.label:', scheme.label, 'scheme.id', scheme.id);
    await myUW[0].addScheme(scheme);
  }

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

  User.prototype.getTasks = async function(work, wh={}) {
    let myWorks;
    if(work === undefined){
      const myUsersWorks = await this.getUsersWorks();
      if (myUsersWorks.length != 1) return null;
      const myTasks = {};
      for(let uw of myUsersWorks){
        const myW = await uw.getWork();
        myTasks[myW.label] = await uw.getTasks({
          order: [['start_time', 'ASC']],
          where: wh,
        });
      }
      return myTasks;
    }else{
      myWorks = await this.getUsersWorks({
        where: { WorkId: work.id },
      });
      if (myWorks.length != 1) return null;
      return await myWorks[0].getTasks({
        where: wh,
        order: [['start_time', 'ASC']],
      });
    }
  }

  return User;
};
