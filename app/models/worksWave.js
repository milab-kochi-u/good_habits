'use strict';
module.exports = (sequelize, DataTypes) => {
  // ユーザのモチベーション推移を記録するテーブル
  const WorksWave = sequelize.define('WorksWave', {
    value: DataTypes.FLOAT,
    date: DataTypes.DATE,
  });

  WorksWave.associate = (models) => {
    WorksWave.belongsTo(models.Work);
  };
  
  return WorksWave;
};

