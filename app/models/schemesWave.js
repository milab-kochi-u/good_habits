'use strict';
module.exports = (sequelize, DataTypes) => {
  // ユーザのモチベーション推移を記録するテーブル
  const SchemesWave = sequelize.define('SchemesWave', {
    value: DataTypes.FLOAT,
    date: DataTypes.DATE,
  });

  SchemesWave.associate = (models) => {
    SchemesWave.belongsTo(models.Scheme);
  };
  
  return SchemesWave;
};