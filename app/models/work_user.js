'use strict';
module.exports = (sequelize, DataTypes) => {
  const Work_user = sequelize.define('Work_user', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      started_at: DataTypes.DATE,
      finished_at: DataTypes.DATE
  }, {});
  Work_user.associate = (models) => {
      Work_user.belongsTo(models.Work);
      Work_user.belongsTo(models.User);

      Work_user.hasMany(models.Task);
  };
  return Work_user;
};

