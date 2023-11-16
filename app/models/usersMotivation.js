'use strict';
module.exports = (sequelize, DataTypes) => {
  // ユーザのモチベーション推移を記録するテーブル
  const UsersMotivation = sequelize.define('UsersMotivation', {
    motivation: DataTypes.FLOAT,
    totalMotivation: DataTypes.FLOAT,
    motiv_need_to_getStart: DataTypes.FLOAT,
    motiv_need_to_getItDone: DataTypes.FLOAT,

  });

  UsersMotivation.associate = (models) => {
    UsersMotivation.belongsTo(models.User);
  };
  
  return UsersMotivation;
};

