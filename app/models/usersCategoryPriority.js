'use strict';
module.exports = (sequelize, DataTypes) => {
  // ユーザのカテゴリ優先度
  const UsersCategoryPriority = sequelize.define('UsersCategoryPriority', {
    priority: DataTypes.FLOAT,
  }, {
    timestamps: false
  });

  UsersCategoryPriority.associate = (models) => {
    UsersCategoryPriority.belongsTo(models.Category);
    UsersCategoryPriority.belongsTo(models.User);
  };
  
  return UsersCategoryPriority;
};

