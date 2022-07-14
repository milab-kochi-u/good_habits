'use strict';
module.exports = (sequelize, DataTypes) => {
  const Work_user_scheme = sequelize.define('Work_user_scheme', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    paranoid: true,
    deletedAt: 'expiredAt'
  });
  Work_user_scheme.associate = (models) => {
      Work_user_scheme.belongsTo(models.Work_user);
      Work_user_scheme.belongsTo(models.Scheme);
  };
  return Work_user_scheme;
};

