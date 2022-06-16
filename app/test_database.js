const models = require('./models/index.js');

(async() => {
    await models.sequelize.sync({force: true });
})();