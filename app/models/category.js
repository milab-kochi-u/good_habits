'use strict';
module.exports = (sequelize, DataTypes) => {
  // ワークのカテゴリ
  const Category = sequelize.define('Category', {
    label: DataTypes.STRING,
    waveLength: DataTypes.INTEGER,
    initialPhase: DataTypes.INTEGER,
  }, {
    timestamps: false
  });

  Category.associate = (models) => {
    Category.belongsToMany(models.User, { through: { model: models.UsersCategoryPriority } });
    Category.belongsToMany(models.Work, { through: { model: models.WorksCategoryPriority } });
  };
  
  return Category;
};
