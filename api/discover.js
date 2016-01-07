var AV      = require('../cloud/av.js');
var router  = require('express').Router();
var q 		= require('q');
var _ 		= require('lodash');

router.get('/test',function(req,res){
	AV.Query.doCloudQuery("select include game,* from Discover where title like '%火%'",{
		success:function(result){
			res.json(result);
		},
		error: function(error){
			//查询失败，查看 error
			res.json(error);
		}
	})
});

/**
 * 发现修改入口
 */
router.post('/:id',function(req,res){
	var discover = AV.Object.createWithoutData('Discover',req.params.id);
	var params = req.params;
	delete params.id;
	_.map(params,function(value,key){
		discover.set(key,value);
	});
	discover.save().then(function(_discover){
		_discover.status = 0;
		_discover.msg = 'ok';
		res.json(_discover);
	},function(err){
		err.status = 101;
		err.msg = "修改发现失败,请检查后重试";
		res.json(err);
	});
});

/**
 * [发现提交]
 * 1.检查相同ID是否重复提交
 * 2.检查发现数据是否完全，并储存
 * 3.隐藏之前相同的发现
 * 4.重新获取此发现（discoverId未自增，开始存入时不会获取到，现在必须重新获取）
 * 5.执行回调
 * @return {void}                                                                                                                                                                                             [description]
 */
router.post('/',function(req,res){
	var promise;
	// 已存在game推荐
	if(req.body.game){
		promise = duplicateCheck(req.body)
		.then(validDiscover)
		.then(hideOldDiscover)
		.then(getDiscover);
	}else{
		promise = validOriginUrl(req.body.originUrl)
		.then(createGame(req.body))
		.then(combineDiscover(req.body))
		.then(validDiscover)
		.then(getDiscover);
	}
	promise.then(function(discover){
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
	});
});

function combineDiscover(params){
	return function(game){
		result = {
			oneWord     : params.oneWord,
			avatar      : params.avatar,
			nickname    : params.nickname,
			userId      : params.userId,
			description : params.description,
			cover       : params.cover,
			title       : params.title,
			game 		: game.id
		}
		return AV.Promise.as(result);
	}
}

/**
 * 手动填写 创建游戏
 * @param  {Object} params 游戏参数对象
 * @return {Promise}        生成的游戏对象
 */
function createGame(params){
	return function(hasDuplicate){
		var promise = new AV.Promise();
		if(!hasDuplicate){
			var imgs = params.img.split(',');
			var _imgs = [];
			_.map(imgs,function(img){
				_imgs.push({url:img});
			});
			var gameData = {
				title:params.title,
				description:params.content.trim(),
				img:_imgs,
				originUrl:params.url,
				type:params.type,
				u77Id:0
			}
			// 表单验证
			_.map(gameData,function(value,key){
				if(!value){
					promise.reject({
						status:103,
						msg:'字段'+key+'不合法,请检查后重试'
					});
				}
			});
			var Game = AV.Object.extend('Game');
			var game = new Game(gameData);
			game.save().then(promise.resolve,promise.reject)
		}else{
			promise.reject({
				status:102,
				msg:'游戏已存在,请重新获取游戏地址.'
			});
		}
		return promise;
	}
}

/**
 * 验证URL是否已经存在
 * @param  {String} url 手动填写的URL
 * @return {Promise}     查找到的结果
 */
function validOriginUrl(url){
	var Game = AV.Object.extend('Game');
	var query = new AV.Query(Game);
	query.equalTo('originUrl',url);
	return query.first();
}

/**
 * 根据ID获取发现
 * @param  {String} id [发现主键Id]
 * @return {promise}    [成功：获取的discover对象]
 */
function getDiscover(id){
	var Discover = AV.Object.extend('Discover');
	var query    = new AV.Query(Discover);
	return query.get(id);
}

/**
 * 检查相同ID是都重复推荐
 * @param  {Discover} discover [传入的discover对象]
 * @return {promise}          [成功：discover对象||失败：错误信息]
 */
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

/**
 * 检查discover参数是否完全
 * @param  {Discover} discover [传入discover对象]
 * @return {promise}          [成功：储存对象并传回||失败：错误信息]
 */
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

/**
 * 隐藏旧的推荐
 * @param  {Discover} discover [传入discover对象]
 * @return {promise}          [成功：传回discover对象主键Id||失败：错误信息]
 */
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

/**
 * 发现列表查询入口
 */
router.get('/list',function(req,res){
	var Discover = AV.Object.extend('Discover');
	var query    = new AV.Query(Discover);
	query.descending('createdAt');
	if(!req.query.debug){
		query.equalTo('isLast',true);	
	}
	if(req.query.isLast){
		query.equalTo('isLast',eval(req.query.isLast));
	}
	if(req.query.page){
		query.skip((req.query.page-1) * 20);
	}
	if(req.query.searchType&&req.query.keywords){
		switch(req.query.searchType){
			case 'title':
				searchTitle(req,res);
				return;
				break;
			case 'game':
				query.equalTo('game',AV.Object.createWithoutData('Game',req.query.keywords));
				break;
			default :
				var key = req.query.keywords;
				if(req.query.searchType == 'discoverId')key = parseInt(key);
				query.equalTo(req.query.searchType,key);
				break;
		}
	}
	if(req.query.keywords && !req.query.searchType){
		searchTitle(req,res);
		return;
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

/**
 * 按标题搜索发现
 * @param  {Object} req 请求
 * @param  {Object} res 响应
 * @return {void}
 */
function searchTitle(req,res){
	var cql = "select include game,* from Discover where title like "
	cql += "'%"+req.query.keywords+"%'";
	if(req.query.isLast){
		cql += " and islast = "+req.query.isLast;
	}
	AV.Query.doCloudQuery(cql,{
		success:function(result){
			res.json(result.results);
		},
		error:function(error){
			console.log(cql);
			res.json(error);
		}
	});
}

/**
 * 首页推荐发现列表入口 
 */
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

/**
 * 发现详情页入口
 */
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
		if(!discover){
			res.send('');
			res.end();
			return;
		}
		discover.set('game',discover.get('game').toJSON());
		var result  = discover.toJSON();
		AV.Promise.all([
			getOtherUser(result.game.objectId,result.userId),
			getOtherGame(result.game.objectId,result.userId),
			getNearGame(result.discoverId)
		]).then(function(success){
			result.otherUser = success[0];
			result.otherGame = success[1];
			result.nearDiscover = success[2];
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

/**
 * 获取其他也推荐过此发现的用户
 * @param  {String} gameid [discover对象的discoverId]
 * @param  {String} userid [当前推荐人得userId]
 * @return {promise}        [成功：discover对象数组||失败：错误信息]
 */
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

/**
 * 获取当前用户推荐过的其他发现
 * @param  {String} gameid [discover对象的discoverId]
 * @param  {String} userid [当前推荐人得userId]
 * @return {promise}        [成功：discover对象||失败：错误信息]
 */
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

/**
 * 获取此发现的相邻的发现（前一个，后一个）
 * @param  {String} discoverId [discover对象的discoverId]
 * @return {promise}        [成功：discover对象数组||失败：错误信息]
 */
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

/**
 * 获取多个发现
 * @param  {String} ids [多个用‘-’相连的discoverId的字符串]
 * @param  {Object} res [响应]
 * @return {promise}     [成功：返回多个发现对象||失败：错误信息]
 */
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

router.delete('/:id',function(req,res){
	// 显示上个 最近的该游戏的推荐还没写
	// var discover = AV.Object.createWithoutData('Discover',req.params.id);
	var Discover = AV.Object.extend('Discover');
	var query = new AV.Query(Discover);
	query.equalTo('objectId',req.params.id);
	query.include('game');
	query.get(req.params.id).then(function(discover){
		var game = discover.get('game');
		game.set('times',game.get('times')-1);
		game.save();
		discover.destroy();
		res.json({
			status : 0,
			msg:'ok'
		})
	});
	
});

/**
 * 在线采集 提交表单
 * {
 * 		game:游戏ID
		description:简介
		oneWord:一句话攻略
		avatar:用户头像
		userId:用户ID
		nickname:用户昵称
		title:游戏标题
		cover:游戏封面图
 * }
 * 手动填写 提交表单
 * {
 * 		game:游戏ID
		description:简介
		oneWord:一句话攻略
		avatar:用户头像
		userId:用户ID
		nickname:用户昵称
		title:游戏标题
		cover:游戏封面图
		imgs:游戏图片列表用,分割
		originUrl:游戏地址
		type:游戏类型 1:web 2:pc 3:android 4:iOS
 * }
 */

module.exports = router;