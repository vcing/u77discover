var AV      = require('../cloud/av.js');
var router  = require('express').Router();
var q 		= require('q');

router.post('/',function(req,res){
	duplicateCheck(req.body)
	.then(validDiscover)
	.then(hideOldDiscover)
	.then(function(discover){
		res.json({
			status:0,
			msg:'ok',
			discover:discover
		})	
	},function(err){
		res.json(err);
	})
});

function duplicateCheck(discover){
	var promise  = new AV.Promise();
	var Discover = AV.Object.extend('Discover');
	var query    = new AV.Query(Discover);
	query.equalTo('userId',discover.userId);
	query.equalTo('game',discover.game);
	query.find().then(function(result){
		if(result.length == 0){
			promise.resolve(discover);
		}else{
			promise.reject({
				status:101,
				msg:'您已推荐过该游戏,请勿重复推荐'
			})
		}
	},function(err){
		err.status = 102;
		err.msg    = '检测重复推荐出错,请重试.';
		promise.reject(err);
	})
	return promise;
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
	result.isLast	   = true;
	var Discover       = AV.Object.extend('Discover');
	var _discover      = new Discover(result);
	_discover.set('game',AV.Object.createWithoutData("Game", discover.game));
	return _discover.save();
}

function hideOldDiscover(discover){
	var promise = new AV.Promise();
	var Discover  = AV.Object.extend('Discover');
	var query = new AV.Query(Discover);
	query.equalTo('game',discover.get('game'));
	query.notEqualTo('objectId',discover.id);
	query.descending('createdAt');
	query.first()
	.then(function(_discover){
		if(_discover){
			_discover.set('isLast',false);
			_discover.save()
			.then(function(){
				promise.resolve(discover);
			},function(err){
				err.status = 102;
				err.msg    = '隐藏重复推荐失败,请重试.';
				promise.reject(err);
			});	
		}else{
			promise.resolve(discover);
		}
		
	});
	return promise;
}

router.get('/list',function(req,res){
	var Discover = AV.Object.extend('Discover');
	var query    = new AV.Query(Discover);
	query.descending('createdAt');
	query.equalTo('isLast',true);
	if(req.params.page){
		query.skip((req.params.page-1) * 20);
	}
	query.limit(60);
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
		var result  = discover.toJSON();
		result.game = discover.get('game');
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
	var Discover  = AV.Object.extend('Discover');
	var game      = AV.Object.extend('Game');
	var querygame = new AV.Query(game);
	querygame.equalTo("objectId",gameid);
	var queryuser = new AV.Query(Discover);
	queryuser.matchesQuery('game',querygame);
	queryuser.notEqualTo('userId',userid);
	queryuser.ascending("createdAt");

	return queryuser.find();
}

function getOtherGame(gameid,userid){
	var game      = AV.Object.extend('Game');
	var query     = new AV.Query(game);
	query.equalTo("objectId",gameid);
	var Discover  = AV.Object.extend('Discover');
	var querygame = new AV.Query(Discover);
	querygame.doesNotMatchQuery('game',query);
	querygame.equalTo('userId',userid);
	querygame.limit(5);
	querygame.descending("createdAt");

	return querygame.find();
}



module.exports = router;