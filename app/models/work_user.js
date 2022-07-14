'use strict';
module.exports = (sequelize, DataTypes) => {
  const Work_user = sequelize.define('Work_user', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    paranoid: true,
    deletedAt: 'expiredAt'
  });
  Work_user.associate = (models) => {
    Work_user.belongsToMany(models.Scheme,{through: {model: models.Work_user_scheme}});
    Work_user.belongsTo(models.Work);
    Work_user.belongsTo(models.User);

    Work_user.hasMany(models.Task);
  };
  return Work_user;
};

