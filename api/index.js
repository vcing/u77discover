var router   = require('express').Router();
var fetch    = require('./fetch.js');
var discover = require('./discover.js');

router.use('/fetch',fetch);
router.use('/discover',discover);

module.exports = router;