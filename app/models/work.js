'use strict';
module.exports = (sequelize, DataTypes) => {

  // ワーク（継続させたいこと）
  const Work = sequelize.define('Work', {
    label: DataTypes.STRING,
    waveLength: DataTypes.INTEGER,
    initialPhase: DataTypes.INTEGER,
  }, {
    timestamps: false
  });

  Work.associate = (models) => {
    Work.belongsToMany(models.Category, { through: { model: models.WorksCategoryPriority } });
    Work.belongsToMany(models.User, { through: { model: models.UsersWork } });
    Work.hasMany(models.UsersWork);
  };

  return Work;
};
