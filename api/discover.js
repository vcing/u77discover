var AV      = require('../cloud/av.js');
var router  = require('express').Router();
var q 		= require('q');

router.post('/',function(req,res){
	validDiscover(req.body).then(function(discover){
		res.json({
			status:0,
			msg:'ok',
			discover:discover
		})	
	},function(err){
		res.json(err);
	})
});

function validDiscover(discover){
	var result         = {};
	result.oneWord     = discover.oneWord;
	result.avatar      = discover.avatar;
	result.nickname    = discover.nickname;
	result.userId      = discover.userId;
	result.description = discover.description;
	result.cover       = discover.cover;
	result.title       = discover.title;
	var Discover       = AV.Object.extend('Discover');
	var _discover       = new Discover(result);
	_discover.set('game',AV.Object.createWithoutData("Game", discover.game));
	return _discover.save();
}

module.exports = router;