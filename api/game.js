var AV      = require('../cloud/av.js');
var router  = require('express').Router();
var q 		= require('q');
var _ 		= require('lodash');

router.get('/list',function(req,res){
	var Game = AV.Object.extend('Game');
	var query = new AV.Query(Game);
	if(req.query.orderBy){
		query.descending(req.query.orderBy);
	}else{
		query.descending('createdAt');
	}
	if(req.query.type)query.equalTo('type',parseInt(req.query.type));
	if(req.query.page)query.skip((req.query.page-1) * 20);
	if(req.query.searchType&&req.query.keywords){
		if(_.includes(['title','description','originUrl'],req.query.searchType))return searchGame(req,res);
		if(_.includes(['times','type','u77Id'],req.query.searchType))req.query.keywords = parseInt(req.query.keywords);
		query.equalTo(req.query.searchType,req.query.keywords);
	}
	query.limit(20);
	query.find().then(function(result){
		res.json(result);
	},function(err){
		err.status = 101;
		err.msg = '获取发现游戏列表失败';
		res.json(err);
	});
});

function searchGame(req,res){
	var cql = "select * from Game where ";
	cql += req.query.searchType + ' like "%'+req.query.keywords+'%"';
	AV.Query.doCloudQuery(cql,{
		success:function(result){
			res.json(result.results);
		},
		error:function(error){
			console.log(cql);
			res.json(error);
		}
	})
}

function createGame(gameInfo){
	var deffered = q.defer();
	var Game = AV.Object.extend('Game');
	var query = new AV.Query(Game);
	query.equalTo('originUrl',gameInfo.originUrl);
	query.find().then(function(result){
		if(result.length == 0){
			var newGame = new Game(gameInfo);
			newGame.save().then(function(_result){
				deffered.resolve(_result);
			},function(err){
				if(err.status){
					deffered.reject(err);
				}else{
					err.status = 112;
					err.msg = '生成游戏失败,请重试';
					deffered.reject(err);
				}
			});
		}else{
			deffered.resolve(result);
		}
	},function(err){
		var newGame = new Game(game);
		newGame.save().then(function(_result){
			deffered.resolve(_result);
		},function(err){
			if(err.status){
				deffered.reject(err);
			}else{
				err.status = 112;
				err.msg = '生成游戏失败,请重试';
				deffered.reject(err);
			}
		});
	});
	return deffered.promise;
}

function createDiscover(discoverInfo){
	var deffered = q.defer();
	var Discover = AV.Object.extend('Discover');
	
	var newDiscover = new Discover(discoverInfo);
	newDiscover.save().then(function(result){
		deffered.resolve(result);
	},function(err){
		if(err.status){
			deffered.reject(err);
		}else{
			err.status = 113;
			err.msg = '生成发现失败,请重试';
			deffered.reject(err);
		}
	});
		
	return deffered.promise;
}


/**
 * 发现修改入口
 */
router.post('/:id',function(req,res){
	var game = AV.Object.createWithoutData('Game',req.params.id);
	var params = req.body;
	delete params.objectId;
	_.map(params,function(value,key){
		game.set(key,parseInt(value));
	});
	game.save().then(function(_game){
		_game.set('status', 0);
		_game.set('msg', 'ok');
		res.json(_game);
	},function(err){
		err.status = 101;
		err.msg = "修改发现失败,请检查后重试";
		res.json(err);
	});
});

/**
 * 删除游戏入口
 */
router.delete('/:id',function(req,res){
	var Game = AV.Object.extend('Game');
	var Discover = AV.Object.extend('Discover');
	var query = new AV.Query(Game);
	var game;
	query.get(req.params.id)
	.then(function(_game){
		game = _game;
		var _query = new AV.Query('Discover');
		_query.equalTo('game',_game);
		return _query.find();
	}).then(function(discovers){
		return AV.Object.destroyAll(discovers);
	// });
	}).then(function(){
		return game.destroy();
	}).then(function(){
		res.json({
			status:0,
			msg:'ok'
		})
	},function(err){
		err.status = 101,
		err.msg = '删除游戏失败';
		res.json();
	})
})

router.post('/',function(req,res){
	console.log(req.body.imgs);
	var imgList = req.body.imgs.split(",");
	var imgs = [] ;
	_.map(imgList,function(img){
		imgs.push({url:img});
	})
	var gameInfo = {
		title:req.body.title,
		description:req.body.description,
		originUrl:req.body.url,
		img:imgs,
		type:parseInt(req.body.type)
	};
	createGame(gameInfo).then(function(game){
		var discoverInfo         = {};
		discoverInfo.oneWord     = req.body.shortDescription;
		discoverInfo.avatar      = req.body.avatar;
		discoverInfo.nickname    = req.body.nickname;
		discoverInfo.userId      = req.body.userId;
		discoverInfo.description = req.body.description;
		discoverInfo.cover       = req.body.topImg;
		discoverInfo.title       = req.body.title;
		discoverInfo.isLast	   = true;
		discoverInfo.game	   = game;
		createDiscover(discoverInfo).then(function(discover){
			discover.set("status",0);
			discover.set("msg","ok");
			res.json(discover);
		},function(err){
			res.json(err);
		});
	},function(err){
		res.json(err);
	});

});

module.exports = router;