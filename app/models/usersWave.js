'use strict';
module.exports = (sequelize, DataTypes) => {
  // ユーザのモチベーション推移を記録するテーブル
  const UsersWave = sequelize.define('UsersWave', {
    value: DataTypes.FLOAT,
    date: DataTypes.DATE,
  });

  UsersWave.associate = (models) => {
    UsersWave.belongsTo(models.User);
  };
  
  return UsersWave;
};

