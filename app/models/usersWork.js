'use strict';
module.exports = (sequelize, DataTypes) => {
  // ユーザが継続しようとしているワーク
  const UsersWork = sequelize.define('UsersWork', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    paranoid: true,
  });
  UsersWork.associate = (models) => {
    UsersWork.belongsToMany(models.Scheme, { through: { model: models.UsersScheme } });
    UsersWork.belongsTo(models.Work);
    UsersWork.belongsTo(models.User);

    UsersWork.hasMany(models.Task);
    UsersWork.hasMany(models.UsersScheme);
  };
  return UsersWork;
};

