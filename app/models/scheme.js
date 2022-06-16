'use strict';
module.exports = (sequelize, DataTypes) => {
  const Scheme = sequelize.define('Scheme', {
    scheme: DataTypes.STRING
  }, {});
  Scheme.associate = (models) => {
  };
  return Scheme;
};
