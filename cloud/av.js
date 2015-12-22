const config       = require('../config/config.js');
const AV           = require('leanengine');

AV.initialize(config.LC_APP_ID, config.LC_APP_KEY, config.LC_MASTER_KEY);
AV.Cloud.useMasterKey();

module.exports = AV;