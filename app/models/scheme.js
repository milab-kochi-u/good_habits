'use strict';
module.exports = (sequelize, DataTypes) => {
  const Scheme = sequelize.define('Scheme', {
    scheme: DataTypes.STRING
  }, {});
  Scheme.associate = (models) => {
    Scheme.belongsToMany(models.Work_user,{through: {model: models.Work_user_scheme}});
  };
  return Scheme;
};
