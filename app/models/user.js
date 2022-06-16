'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
      name: DataTypes.STRING,
  }, {});
  User.associate = (models) => {
    User.belongsToMany(models.Work,{through: {model: models.Work_user, unique: false}});

    User.hasMany(models.Work_user);
  };
  return User;
};