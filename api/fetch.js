var AV      = require('../cloud/av.js');
var router  = require('express').Router();
var q       = require('q');
var cheerio = require('cheerio');
var request = require('request');
var iconv   = require('iconv-lite');
var err 	= require('../cloud/error.js');
var _       = require('lodash');
var moment  = require('moment');

var support = {
	'3366.com':function(url){
		var deffered = q.defer();

		request({
			url:url,
			method:"GET",
			encoding:null,
			timeout:3000,
		},function(err,res,body){
			if(err || !body){
				err.status = 101;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var html = iconv.decode(new Buffer(res.body),'GBK').toString();
			var $ = cheerio.load(html);
			if($('.gm_img_300 img').length == 0){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			downloadImage($('.gm_img_300 img').attr('src')).then(function(result){
				var title = $('.gm_desc.gm_title h1').text();
				var description = $('#gm_summary p').text();
				if(title && description){
					var result = {
						title:title,
						description:description,
						img:[result],
						url:url,
						status:0
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 101,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 102;
				err.msg = "图片存储错误.";
				deffered.reject(err);
				return false;
			});
		});
		return deffered.promise;
	},
	'4399.com':function(url){
		var deffered = q.defer();
		var index = url.lastIndexOf('_');
		if(index != -1){
			url = url.substr(0,index) + '.htm';
		}
		request({
			url:url,
			method:"GET",
			encoding:null,
			timeout:3000,
		},function(err,res,body){
			if(err || !body){
				err.status = 101;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var html = iconv.decode(new Buffer(res.body),'GBK').toString();
			var $ = cheerio.load(html);
			if($('#pics_list img').length == 0 && $('.p_img img').length == 0){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var imgQueue = [];
			_.map($('#pics_list img'),function(img){
				imgQueue.push(downloadImage($(img).attr('src')?$(img).attr('src'):$(img).attr('lz_src')));
			});

			if(imgQueue.length == 0){
				imgQueue.push(downloadImage($('.p_img img').attr('src')));
			}

			q.all(imgQueue).then(function(results){
				var description = $('#introduce2').text();
				if(description){
					description = description.substr(3);
				}
				var title = $('.pag_h1 a').text();
				if(title && description){
					var result = {
						title:title,
						description:description,
						img:results,
						url:url,
						status:0
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 101,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 102;
				err.msg = "图片存储错误.";
				deffered.reject(err);
				return false;
			});
		});
		return deffered.promise;
	},
	'kongregate.com':function(url){
		var deffered = q.defer();
		var remove = ['!','#','?','&'];
		_.map(remove,function(bad){
			if(url.indexOf(bad) != -1){
				url = url.split(bad)[0];
			}
		});
		url += "/show_hover";
		request({
			url:url,
			method:'GET',
			timeout:15000
		},function(err,res,body){
			if(err || !body){
				err.status = 101;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var html = body;
			var $ = cheerio.load(html);
			if($('.screenshot_img').length == 0){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			downloadQuene = [];
			_.map($('.screenshot_img'),function(dom){
				downloadQuene.push(downloadImage($(dom).attr('src')));
			});
			q.all(downloadQuene).then(function(results){
				var title = $('.gm_desc.gm_title h1').text();
				var description = $('#gm_summary p').text();
				if(title && description){
					var result = {
						title:title,
						description:description,
						img:results,
						url:url,
						status:0
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 101,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 102;
				err.msg = "图片存储错误.";
				deffered.reject(err);
				return false;
			});	
		});
		return deffered.promise;
	},
	'7k7k.com':function(url){
		var deffered = q.defer();
		var items = url.split('/');
		_.map(items,function(value,key){
			if(value == 'swf'){
				items[key] = 'flash';
			}
		});
		url = items.join('/');

		request({
			url:url,
			encoding:null,
			method:'get',
			timeout:3000,
		},function(err,res,body){
			if(err || !body){
				err.status = 101;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var html = body;
			var $ = cheerio.load(html);
			if($('.ui-img-list .pic').length == 0){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			downloadQuene = [];
			_.map($('.ui-img-list .pic'),function(dom){
				downloadQuene.push(downloadImage($(dom).attr('src')));
			});
			q.all(downloadQuene).then(function(results){
				var title = $('#game-info h1 a').text();
				var description = $('#game-info .game-describe').text();
				if(title && description){
					var result = {
						title:title,
						description:description,
						img:results,
						url:url,
						status:0
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 101,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 102;
				err.msg = "图片存储错误.";
				deffered.reject(err);
				return false;
			});	
		});

		return deffered.promise;
	},
	'17yy.com':function(url){
		var deffered = q.defer();
		var items = url.split('/');
		_.map(items,function(value,key){
			if(value == 'play'){
				items.splice(key,1);
			}
		});
		url = items.join('/');

		request({
			url:url,
			encoding:null,
			method:'get',
			timeout:3000,
		},function(err,res,body){
			if(err || !body){
				err.status = 101;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var html = iconv.decode(new Buffer(res.body),'GBK').toString();
			var $ = cheerio.load(html);
			if($('.b_pic img').length == 0){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			downloadImage($('.b_pic img').attr('src')).then(function(results){
				var title = $('.t2_1 h1').text();
				var description = $('#flashsay p').text();
				if(title && description){
					var result = {
						title:title,
						description:description,
						img:[results],
						url:url,
						status:0
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 101,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 102;
				err.msg = "图片存储错误.";
				deffered.reject(err);
				return false;
			});	
		});

		return deffered.promise;
	},
	'2144.cn':function(url){
		var deffered = q.defer();
		var items = url.split('/');

		_.map(items,function(value,key){
			if(value == 'html'){
				items[key] = 'flash'
				items.splice(key+1,1);
			}
		});

		url = items.join('/');

		if(url.lastIndexOf('/') == url.length-1){
			url = url.substr(0,url.length-1) + '.htm';
		}

		request({
			url:url,
			encoding:null,
			method:'get',
			timeout:3000,
		},function(err,res,body){
			if(err || !body){
				err.status = 101;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var html = iconv.decode(new Buffer(res.body),'utf-8').toString();
			var $ = cheerio.load(html);
			if($('.slidewrap img').length == 0){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			downloadQuene = [];
			_.map($('.slidewrap img'),function(dom){
				downloadQuene.push(downloadImage($(dom).attr('src')));
			});
			q.all(downloadQuene).then(function(results){
				var title = $('#get-tit a').text();
				var description = $('#detail-con').text();
				if(title && description){
					var result = {
						title:title,
						description:description.trim(),
						img:results,
						url:url,
						status:0
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 101,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 102;
				err.msg = "图片存储错误.";
				deffered.reject(err);
				return false;
			});	
		});

		return deffered.promise;
	},
	'u77.com':function(url){
		var deffered = q.defer();
		var items = url.split('/');
		var gameurl = 'http://www.u77.com/api/'+items[items.length - 2]+'?id='+items[items.length - 1];
		request({
			url:gameurl,
			encoding:null,
			method:'get',
			timeout:3000,
		},function(err,res,body){
			if(err || !body){
				err.status = 101;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}

			data = JSON.parse(body);

			var game = data.gameInfo;

			var result = {
				title:game.title,
				description:game.content.trim(),
				img:[{url:game.image}],
				url:url,
				status:0,
				u77Id:parseInt(items[items.length - 1])
			}
			deffered.resolve(result);
		});

		return deffered.promise;
	},
	'steampowered.com':function(url){
		var deffered = q.defer();

		request({
			url:url,
			encoding:null,
			method:'get',
			timeout:3000,
		},function(err,res,body){
			if(err || !body){
				err.status = 101;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var $ = cheerio.load(body);
			if($('#agecheck_form').length != 0){
				var err = {
					status : 103,
					msg : "此游戏有年龄限制."
				}
				deffered.reject(err);
				return false;
			}

			if($('.game_header_image_full').length == 0){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}

			downloadImage($('.game_header_image_full').attr('src')).then(function(results){
				var title = $('.apphub_AppName').text();
				var description = $('#game_area_description').text();
				if(title && description){
					var result = {
						title:title,
						description:description.trim(),
						img:[results],
						url:url,
						status:0
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 101,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 102;
				err.msg = "图片存储错误.";
				deffered.reject(err);
				return false;
			});	
		});

		return deffered.promise;
	}
}

function downloadImage(url){
	// 去掉图片参数
	var remove = ['!','#','?','&'];
	_.map(remove,function(bad){
		if(url.indexOf(bad) != -1){
			url = url.split(bad)[0];
		}
	});
	var deffered = q.defer();
	var auth = new Buffer('u77fetch:u77fetch');
	var saveUrl = "http://v0.api.upyun.com/u77img/discover-fetch/"+moment().year()+"/"+moment().month()+"/"+randomString(16)+'.'+getExtension(url);
	request.get({
		url:url,
		method:'GET',
		timeout:15000
	},function(err,res,body){
		if(err || !body){
			deffered.reject(err ? err : 'no body');
		}
	})
	.pipe(request({
		url:saveUrl,
		method:'PUT',
		headers:{
			"Authorization":'Basic '+auth.toString('base64')
		}
	},function(err,res,body){
		if(err || body || res.headers['x-error-code']){
			deffered.reject(err?err:body || res.headers['x-error-code']);
		}else{
			deffered.resolve({url:saveUrl.replace('v0.api.upyun.com/u77img','img.u77.com')});
		}
	}));
	
	return deffered.promise;
}

function getExtension(url){
	var _bad = ['!','#','?'];
	var _arr = url.split('.');
	_ext = _arr[_arr.length - 1];
	if(_ext.length <= 4){
		return _ext;
	}else{
		_.map(_bad,function(bad){
			if(_ext.indexOf(bad) != -1){
				_ext = _ext.split(bad)[0];
			}
		});
		return _ext;
	}
}

function randomString(len) {
　　len = len || 32;
　　var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
　　var maxPos = $chars.length;
　　var pwd = '';
　　for (i = 0; i < len; i++) {
　　　　pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
　　}
　　return pwd;
}

function fetch(url){
	var _fn;
	_.mapKeys(support,function(fn,key){
		if(url.indexOf(key) != -1){
			_fn = fn;
		}
	});
	if(_fn === undefined){
		var deffered = q.defer();
		var err = {
			status : 101,
			msg : "未找到游戏资源."
		}
		deffered.reject(err);
		return deffered.promise;
	}
	return _fn(url);
}

function createGame(url,res){
	fetch(url).then(function(result){
		result.originUrl = result.url;

		delete result.url;
		result.u77Id = result.u77Id || 0;
		result.times = 0;
		var Game = AV.Object.extend('Game');
		var _game = new Game(result);
		_game.save().then(function(__game){
			__game.status = 0;
			__game.msg = 'ok';
			res.json(__game);
		},function(err){
			if(err.status){
				res.json(err);
			}else{
				err.status = 112;
				err.msg = '生成游戏失败,请重试';
				res.json(err);
			}
			
		});
	},function(err){
		if(err.status){
			res.json(err);
		}else{
			err.status = 111;
			err.msg = '创建游戏出错,请重试';
			res.json(err);
		}
		
	});
}

router.get('/:url',function(req,res){
	var url = req.params.url;
	// query game
	var Game = AV.Object.extend('Game');
	var query = new AV.Query(Game);
	query.equalTo('originUrl',url);
	query.first().then(function(game){
		if(game){
			res.json(game);
		}else{
			createGame(url,res);		
		}
	},function(err){
		createGame(url,res);
	});
});

router.post('/:url',function(req,res){
	var url = req.params.url;
});



module.exports = router;
