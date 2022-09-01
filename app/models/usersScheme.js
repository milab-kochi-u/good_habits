'use strict';
module.exports = (sequelize, DataTypes) => {
  // ユーザがワークを実施する際に採用している工夫
  const UsersScheme = sequelize.define('UsersScheme', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    paranoid: true,
  });

  UsersScheme.associate = (models) => {
    UsersScheme.belongsTo(models.UsersWork);
    UsersScheme.belongsTo(models.Scheme);
  };
  
  return UsersScheme;
};

