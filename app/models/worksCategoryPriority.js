'use strict';
module.exports = (sequelize, DataTypes) => {
  // ワークのカテゴリ優先度
  const WorksCategoryPriority = sequelize.define('WorksCategoryPriority', {
    priority: DataTypes.FLOAT,
  }, {
    timestamps: false
  });

  WorksCategoryPriority.associate = (models) => {
    WorksCategoryPriority.belongsTo(models.Category);
    WorksCategoryPriority.belongsTo(models.Work);
  };
  
  return WorksCategoryPriority;
};

