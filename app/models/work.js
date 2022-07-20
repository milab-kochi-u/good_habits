'use strict';
module.exports = (sequelize, DataTypes) => {

  // ワーク（継続させたいこと）
  const Work = sequelize.define('Work', {
    label: DataTypes.STRING
  }, {});

  Work.associate = (models) => {
    Work.belongsToMany(models.User, { through: { model: models.UsersWork } });
    Work.hasMany(models.UsersWork);
  };

  return Work;
};
