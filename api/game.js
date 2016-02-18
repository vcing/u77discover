var AV      = require('../cloud/av.js');
var router  = require('express').Router();
var q 		= require('q');
var _ 		= require('lodash');

/**
 * 列表入口
 */
router.get('/list',function(req,res){
	var Game = global.Game;
	var query = new AV.Query(Game);
	console.log(req.query);
	if(req.query.orderBy){
		query.addDescending(req.query.orderBy);
	}else{
		query.addDescending('createdAt');
	}
	if(req.query.type)query.equalTo('type',parseInt(req.query.type));
	if(req.query.page)query.skip((req.query.page-1) * 20);
	if(req.query.search_type&&req.query.keywords){
		if(_.includes(['title','description','originUrl'],req.query.search_type))return searchGame(req,res);
		if(_.includes(['times','type','u77Id'],req.query.search_type))req.query.keywords = parseInt(req.query.keywords);
		query.equalTo(req.query.search_type,req.query.keywords);
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
	cql += req.query.search_type + ' like "%'+req.query.keywords+'%"';
	console.log(cql);
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
		err.status = 102;
		err.msg = "修改发现失败,请检查后重试";
		res.json(err);
	});
});

/**
 * 删除游戏入口
 */
router.delete('/:id',function(req,res){
	var Game = global.Game;
	var Discover = global.Discover;
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
		err.status = 103,
		err.msg = '删除游戏失败';
		res.json();
	});
});


module.exports = router;