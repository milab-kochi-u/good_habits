'use strict';
module.exports = (sequelize, DataTypes) => {

  // ワークを実施する際の工夫
  const Scheme = sequelize.define('Scheme', {
    label: DataTypes.STRING,
    waveLength: DataTypes.INTEGER,
    initialPhase: DataTypes.INTEGER,
  }, {
    timestamps: false
  });

  Scheme.associate = (models) => {
    Scheme.belongsToMany(models.Category, { through: { model: models.SchemesCategoryPriority } });
    Scheme.belongsToMany(models.UsersWork, { through: { model: models.UsersScheme, unique:false}});
    Scheme.hasMany(models.UsersScheme);
    Scheme.hasMany(models.SchemesWave);
  };
  
  return Scheme;
};
