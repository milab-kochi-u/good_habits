'use strict';
module.exports = (sequelize, DataTypes) => {
  // 工夫のカテゴリ優先度
  const SchemesCategoryPriority = sequelize.define('SchemesCategoryPriority', {
    priority: DataTypes.FLOAT,
  }, {
    timestamps: false
  });

  SchemesCategoryPriority.associate = (models) => {
    SchemesCategoryPriority.belongsTo(models.Category);
    SchemesCategoryPriority.belongsTo(models.Scheme);
  };
  
  return SchemesCategoryPriority;
};

