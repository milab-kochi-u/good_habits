'use strict';
module.exports = (sequelize, DataTypes) => {

  // シミュレーションのログ
  const SimulationLog = sequelize.define('SimulationLog', {
    startedAt: DataTypes.DATE,
    finishedAt: DataTypes.DATE
  }, {});
  
  return SimulationLog;
};