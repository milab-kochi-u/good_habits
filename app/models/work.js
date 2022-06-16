'use strict';
module.exports = (sequelize, DataTypes) => {
  const Work = sequelize.define('Work', {
    work: DataTypes.STRING
  }, {});
  Work.associate = (models) => {
    Work.belongsToMany(models.User,{through: { model: models.Work_user, unique: false}});

    Work.hasMany(models.Work_user);
  };
  return Work;
};
