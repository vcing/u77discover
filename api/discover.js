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
		var result = discover.toJSON();
		result.game = discover.get('game');

		// var game = AV.Object.extend('Game');
		// var querygame = new AV.Query(game);
		// querygame.equalTo("objectId",result.game.id);
		// var otherUser    = new AV.Query(Discover);
		// otherUser.matchesQuery('game',querygame);
		// //queryother.notEqualTo('userId',result.userId);
		// otherUser.ascending("createdAt");
		// otherUser.find().then(function(success){
		// 	result.other = success;
		// 	res.json(result);
		// },function(err){
		// 	result.other = success;
		// 	res.json(result);
		// });
		// 
		AV.Promise.all([
			getOtherUser(result.game.id,result.userId),
			getOtherGame(result.game.id,result.userId)
		]).then(function(successs){
			result.otherUser = successs[0];
			result.otherGame = successs[1];
			res.json(result);
		},function(errs){
			result.otherUser = errs[0];
			result.otherGame = errs[1];
			res.json(result);
		});
		
	},function(err){
		res.json(err);
	});

});

function getOtherUser(gameid,userid){
	var Discover = AV.Object.extend('Discover');
	var game = AV.Object.extend('Game');
	var querygame = new AV.Query(game);
	querygame.equalTo("objectId",gameid);
	var queryuser    = new AV.Query(Discover);
	queryuser.matchesQuery('game',querygame);
	queryuser.notEqualTo('userId',userid);
	queryuser.ascending("createdAt");

	return queryuser.find();
}

function getOtherGame(gameid,userid){
	var game = AV.Object.extend('Game');
	var query = new AV.Query(game);
	query.equalTo("objectId",gameid);
	var Discover = AV.Object.extend('Discover');
	var querygame = new AV.Query(Discover);
	querygame.doesNotMatchQuery('game',query);
	querygame.equalTo('userId',userid);
	querygame.limit(10);
	querygame.descending("createdAt");

	return querygame.find();
}

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