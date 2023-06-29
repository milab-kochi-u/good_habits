'use strict';
module.exports = (sequelize, DataTypes) => {
  // ユーザのモチベーション推移を記録するテーブル
  const UsersMotivation = sequelize.define('UsersMotivation', {
    motivation: DataTypes.FLOAT,
  });

  UsersMotivation.associate = (models) => {
    UsersMotivation.belongsTo(models.User);
  };
  
  return UsersMotivation;
};

