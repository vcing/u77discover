var AV           = require('../cloud/av.js');
var router       = require('express').Router();
var q            = require('q');
var cheerio      = require('cheerio');
var request      = require('request');
var iconv        = require('iconv-lite');
var err          = require('../cloud/error.js');
var _            = require('lodash');
var moment       = require('moment');
var usFetchPath  = require('../config/config.js').usFetch;
var androidFetch = require('./androidFetch.js');

/**
 * 支持的网址和对应的方法
 * @type {String(网址)：function(对应获取资源的方法)}
 */
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
					status : 102,
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
						type:1
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 103,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 104;
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
				err.status = 105;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 106,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var html = iconv.decode(new Buffer(res.body),'GBK').toString();
			var $ = cheerio.load(html);
			if($('#pics_list img').length == 0 && $('.p_img img').length == 0){
				var err = {
					status : 107,
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
						type:1
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 108,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 109;
				err.msg = "图片存储错误.";
				deffered.reject(err);
				return false;
			});
		});
		return deffered.promise;
	},
	'kongregate.com':function(url){
		return fetchFromUSA(url);
	},
	'a10.com':function(url){
		return fetchFromUSA(url);
	},
	'enemy.com':function(url){
		return fetchFromUSA(url);
	},
	'miragine.com':function(url){
		return fetchFromUSA(url);
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
				err.status = 110;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 111,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var html = body;
			var $ = cheerio.load(html);
			if($('.ui-img-list .pic').length == 0){
				var err = {
					status : 112,
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
						type:1
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 113,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 114;
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
				err.status = 115;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 116,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var html = iconv.decode(new Buffer(res.body),'GBK').toString();
			var $ = cheerio.load(html);
			if($('.b_pic img').length == 0){
				var err = {
					status : 117,
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
						type:1
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 118,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 119;
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
				err.status = 120;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 121,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var html = iconv.decode(new Buffer(res.body),'utf-8').toString();
			var $ = cheerio.load(html);
			if($('.slidewrap img').length == 0){
				var err = {
					status : 122,
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
						type:1
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 123,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 124;
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
				err.status = 125;
				err.msg = "未找到游戏资源.";
				deffered.reject(err);
				return false;
			}
			if(res.statusCode == 404){
				var err = {
					status : 126,
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
				type:1,
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
					status : 127,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			var $ = cheerio.load(body);
			if($('#agecheck_form').length != 0){
				var err = {
					status : 128,
					msg : "此游戏有年龄限制."
				}
				deffered.reject(err);
				return false;
			}

			if($('.game_header_image_full').length == 0){
				var err = {
					status : 129,
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
						type:2
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 130,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 131;
				err.msg = "图片存储错误.";
				deffered.reject(err);
				return false;
			});	
		});

		return deffered.promise;
	},
	'wandoujia.com':function(url){
		return androidFetch(url);
	},
	'android.myapp.com':function(url){
		return androidFetch(url);
	},
	'play.google.com':function(url){
		return androidFetch(url);
	},
	'shouji.baidu.com':function(url){
		return androidFetch(url);
	},
	'zhushou.360.cn':function(url){
		return androidFetch(url);
	},
	'app.mi.com':function(url){
		return androidFetch(url);
	},
	'm.163.com/android':function(url){
		return androidFetch(url);
	},
	'android.d.cn':function(url){
		return androidFetch(url);
	},
	'shouji.com.cn':function(url){
		return androidFetch(url);
	},
	'appchina.com':function(url){
		return androidFetch(url);
	},
	'apple.com':function(url){
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
					status : 127,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}

			var $ = cheerio.load(body);

			if($('.iphone-screen-shots img').length == 0) {
				var err = {
					status : 129,
					msg : "未找到游戏资源."
				}
				deffered.reject(err);
				return false;
			}
			downloadQuene = [];
			_.map($('.iphone-screen-shots img'),function(dom){
				downloadQuene.push(downloadImage($(dom).attr('src')));
			});
			q.all(downloadQuene).then(function(results){
				var title = $('#title h1').text();
				var description = $('.center-stack .product-review p[itemprop="description"]').text();
				if(title && description){
					var result = {
						title:title,
						description:description.trim(),
						img:results,
						url:url,
						type:4
					}
					deffered.resolve(result);
				}else{
					var err = {
						status : 130,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
			},function(err){
				err.status = 131;
				err.msg = "图片存储错误.";
				deffered.reject(err);
				return false;
			});	
		});

		return deffered.promise;
	}
}

/**
 * 下载发现中的图片，并转存在U盘云中
 * @param  {String} url [传入要储存图片的地址]
 * @return {promise}     [成功：储存的地址||失败：错误信息]
 */
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
	//转存地址的文件名为（年+月+16位随机码）
	var saveUrl = "http://v0.api.upyun.com/u77img/discover-fetch/"+moment().year()+"/"+moment().month()+"/"+randomString(16)+'.'+getExtension(url);
	//获取图片并储存
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
			//变更U盘云为U77内地址
			deffered.resolve({url:saveUrl.replace('v0.api.upyun.com/u77img','img.u77.com')});
		}
	}));
	
	return deffered.promise;
}

/**
 * 获取文件后缀名
 * @param  {String} url [传入文件地址]
 * @return {String}     [传入文件的后缀名]
 */
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

/**
 * 生成随机码
 * @param  {int} len [随机码长度]
 * @return {String}     [生成的随机码]
 */
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

/**
 * 获取对应的方法
 * @param  {String} url [要获取资源的地址]
 * @return {promise}     [成功：获取的资源||失败：错误信息]
 */
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
			status : 132,
			msg : "未找到游戏资源."
		}
		deffered.reject(err);
		return deffered.promise;
	}
	return _fn(url);
}


/**
 * 从美国节点获取游戏数据
 * @param  {String} url 游戏URL
 * @return {Promise}    采集成功后的结果json
 */
function fetchFromUSA(url){
	var deffered = q.defer();
	request({
		url:usFetchPath+'api/fetch/'+encodeURIComponent(url),
		method:'get'
	},function(err,res,body){
		if(err || !body){
			err = err || {};
			err.status = 133;
			err.msg = "未找到游戏资源.";
			deffered.reject(err);
			return false;
		}
		try{
			var result = JSON.parse(body);
			if(!result.status){
				deffered.resolve(result);
			}else{
				deffered.reject(result);
			}
		}catch(e){
			deffered.reject(e);
		}
	});
	return deffered.promise;
}

/**
 * 存入游戏信息
 * @param  {String} url [游戏地址]
 * @param  {String} res [响应]
 * @return 	{promise}	[成功：储存的发现对象||失败：错误信息]
 */
function createGame(url,res){
	fetch(url).then(function(result){
		result.originUrl = result.url;
		delete result.url;
		result.u77Id = result.u77Id || 0;
		result.times = 0;
		var Game = global.Game;
		var _game = new Game(result);
		_game.save().then(function(__game){
			__game.set('status',0);
			__game.set('msg', 'ok');
			res.json(__game);
		},function(err){
			if(err.status){
				res.json(err);
			}else{
				err.status = 134;
				err.msg = '生成游戏失败,请重试';
				res.json(err);
			}
			
		});
	},function(err){
		if(err.status){
			res.json(err);
		}else{
			err.status = 135;
			err.msg = '创建游戏出错,请重试';
			res.json(err);
		}
	});
}

/**
 * [路由入口]
 * 查询游戏库，如果没有则创建新游戏
 */
router.get('/:url',function(req,res){
	var url = req.params.url;
	// query game
	var Game = global.Game;
	var query = new AV.Query(Game);
	query.equalTo('originUrl',url);
	query.first().then(function(game){
		if(game){
			game.set('status', 0);
			game.set('msg', 'ok');
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
