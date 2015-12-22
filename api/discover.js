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

router.get('/list',function(req,res){
	var Discover = AV.Object.extend('Discover');
	var query    = new AV.Query(Discover);
	query.descending('createdAt');
	if(req.params.page){
		query.skip((req.params.page-1) * 20);
	}
	query.limit(20);
	query.find().then(function(result){
		res.json(result);
	},function(err){
		res.json(err);
	});
});

router.get('/:id',function(req,res){
	var Discover = AV.Object.extend('Discover');
	var query    = new AV.Query(Discover);
	query.equalTo('discoverId',parseInt(req.params.id));
	query.include('game');
	query.first().then(function(discover){
		res.json(discover);
	},function(err){
		res.json(err);
	});
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
	var _discover      = new Discover(result);
	_discover.set('game',AV.Object.createWithoutData("Game", discover.game));
	return _discover.save();
}

module.exports = router;