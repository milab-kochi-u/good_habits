'use strict';
module.exports = (sequelize, DataTypes) => {
  // ワークを実施する際の工夫
  const Scheme = sequelize.define('Scheme', {
    label: DataTypes.STRING
  }, {});

  Scheme.associate = (models) => {
    Scheme.belongsToMany(models.UsersWork, { through: { model: models.UsersScheme } });
  };
  
  return Scheme;
};
