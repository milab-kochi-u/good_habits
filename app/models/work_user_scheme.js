'use strict';
module.exports = (sequelize, DataTypes) => {
  const Work_user_scheme = sequelize.define('Work_user_scheme', {
  }, {});
  Work_user_scheme.associate = (models) => {
      Work_user_scheme.belongsTo(models.Work_user,{as: 'work_userID'});
      Work_user_scheme.belongsTo(models.Scheme,{as: 'schemeID'});

      Work_user_scheme.belongsTo(models.Work_user,{foreignKey: 'started_at'});
      Work_user_scheme.belongsTo(models.Work_user,{foreignKey: 'finished_at'});

  };
  return Work_user_scheme;
};

