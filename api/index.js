var router   = require('express').Router();
var fetch    = require('./fetch.js');
var discover = require('./discover.js');
var game     = require('./game.js');


var request = require('request');
var cheerio = require('cheerio');
var moment  = require('moment');

router.use('/fetch',fetch);
router.use('/discover',discover);
router.use('/game',game);


/*-----------------------------------*/
// router.get('/test',function(req,res){
// 	getLoginCookies()
// 	.then(createMoblieGame('http://www.appchina.com/app/com.netease.kfpanda3.appchina'))
// 	.then(function(result){
// 		console.log(result);
// 		res.send('ok');
// 	});
// });


/*-----------------------------------*/

module.exports = router;