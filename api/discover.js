var AV      = require('../cloud/av.js');
var router  = require('express').Router();
var q 		= require('q');
var _ 		= require('lodash');

router.post('/',function(req,res){
	duplicateCheck(req.body)
	.then(validDiscover)
	.then(hideOldDiscover)
	.then(getDiscover)
	.then(function(discover){
		res.json({
			status:0,
			msg:'ok',
			discover:discover
		})	
	},function(err){
		if(err.status){
			res.json(err);
		}else{
			err.status = 101;
			err.msg = '游戏发射失败,请联系检修组';
			res.json(err);	
		}
	})
});

function getDiscover(id){
	var Discover = AV.Object.extend('Discover');
	var query    = new AV.Query(Discover);
	return query.get(id);
}

function duplicateCheck(discover){
	var promise  = new AV.Promise();
	var Discover = AV.Object.extend('Discover');
	var query    = new AV.Query(Discover);
	query.equalTo('userId',discover.userId);
	var game = AV.Object.createWithoutData('Game', discover.game);
	query.equalTo('game',game);
	query.find().then(function(result){
		if(result.length == 0){
			game.increment('times');
			game.save();
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
				promise.resolve(discover.id);
			},function(err){
				err.status = 102;
				err.msg    = '隐藏重复推荐失败,请重试.';
				promise.reject(err);
			});	
		}else{
			promise.resolve(discover.id);
		}
		
	});
	return promise;
}

router.get('/list',function(req,res){
	var Discover = AV.Object.extend('Discover');
	var query    = new AV.Query(Discover);
	query.descending('createdAt');
	query.equalTo('isLast',true);
	if(req.query.page){
		query.skip((req.query.page-1) * 20);
	}
	query.include('game');
	query.limit(20);
	query.find().then(function(result){
		_.map(result,function(discover){
			discover.set('game',discover.get('game').toJSON());
		});
		res.json(result);
	},function(err){
		err.status = 101;
		err.msg = '获取发现列表失败';
		res.json(err);
	});
});

router.get('/index',function(req,res){
	var Discover = AV.Object.extend('Discover');
	var query    = new AV.Query(Discover);
	query.descending('createdAt');
	query.equalTo('isLast',true);
	query.limit(5);
	query.find().then(function(result){
		result.status = 0;
		result.msg = 'ok';
		res.json(result);
	},function(err){
		err.status = 101;
		err.msg = '获取发现列表失败';
		res.json(err);
	});
});

router.get('/:id',function(req,res){
	if(req.params.id.indexOf('-') != -1){
		getListGame(req.params.id,res);
		return;
	}
	var Discover = AV.Object.extend('Discover');
	var query    = new AV.Query(Discover);
	query.equalTo('discoverId',parseInt(req.params.id));
	query.include('game');
	query.first().then(function(discover){
		var result  = discover.toJSON();
		result.game = discover.get('game');
		AV.Promise.all([
			getOtherUser(result.game.id,result.userId),
			getOtherGame(result.game.id,result.userId),
			getNearGame(result.discoverId)
		]).then(function(successs){
			result.otherUser = successs[0];
			result.otherGame = successs[1];
			result.nearDiscover = successs[2];
			result.status = 0;
			result.msg = 'ok';
			res.json(result);
		},function(err){
			err.status = 102;
			err.msg = '查询游戏相关信息失败';
			res.json(err);
		});
		
	},function(err){
		err.status = 101;
		err.msg = '查询游戏失败';
		res.json(err);
	});

});

function getOtherUser(gameid,userid){
	var Discover  = AV.Object.extend('Discover');
	var Game      = AV.Object.extend('Game');
	var querygame = new AV.Query(Game);
	querygame.equalTo("objectId",gameid);
	var queryuser = new AV.Query(Discover);
	queryuser.matchesQuery('game',querygame);
	queryuser.notEqualTo('userId',userid);
	queryuser.ascending("createdAt");
	return queryuser.find();
}

function getOtherGame(gameid,userid){
	var Game      = AV.Object.extend('Game');
	var query     = new AV.Query(Game);
	query.equalTo("objectId",gameid);
	var Discover  = AV.Object.extend('Discover');
	var querygame = new AV.Query(Discover);
	querygame.doesNotMatchQuery('game',query);
	querygame.equalTo('userId',userid);
	querygame.descending("createdAt");
	return querygame.first();
}

function getNearGame(discoverId){
	var Discover = AV.Object.extend('Discover');
	var queryPrev = new AV.Query(Discover);
	var queryNext = new AV.Query(Discover);
	queryPrev.select('title','discoverId');
	queryNext.select('title','discoverId');
	queryPrev.equalTo('discoverId',parseInt(discoverId)-1);
	queryNext.equalTo('discoverId',parseInt(discoverId)+1);
	var mainQuery = AV.Query.or(queryPrev,queryNext);
	return mainQuery.find();
}

function getListGame(ids,res){
	ids = ids.split('-');
	var Discover = AV.Object.extend('Discover');
	var query = new AV.Query(Discover);
	_.map(ids,function(id,key){
		ids[key] = parseInt(id);
	});
	query.containedIn('discoverId',ids);
	query.find().then(function(result){
		result.status = 0;
		result.msg = 'ok';
		res.json(result);
	},function(err){
		err.status = 101;
		err.msg = '获取游戏列表失败';
		res.json(err);
	});
}

module.exports = router;