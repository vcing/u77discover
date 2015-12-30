var AV      = require('../cloud/av.js');
var router  = require('express').Router();
var q       = require('q');
var cheerio = require('cheerio');
var request = require('request');
var err 	= require('../cloud/error.js');
var _       = require('lodash');
var moment  = require('moment');

/**
 * 执行获取手游入口
 * @param  {String} url [获取的地址]
 * @return {promise}     [成功：获取到的资源||失败：错误信息]
 */
function fetch(url){
	var deffered = q.defer();
	getLoginCookies()
	.then(createMoblieGame(url))
	.then(function(result){
		deffered.resolve(result);
	},function(err){
		deffered.reject(err);
	});
	return deffered.promise;
}

/**
 * 获取新的手游
 * @param  {String} url [获取的地址]
 * @return {promise}     [成功：获取到的资源||失败：错误信息]
 */
function createMoblieGame(url){
	return function(j){
		var deffered = q.defer();
		request({
			url:'http://www.coolapk.com/faxian/create',
			method:'get',
			jar:j
		},function(err,res,body){
			if(err || !body){
				var err = {
					status : 101,
					msg : "未找到游戏资源."
				}
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
			if($('.ex-reply-form input[name=requestHash]').length > 1){
				var err = {
					status : 103,
					msg : "游戏资源获取失败，请联系管理员."
				}
				deffered.reject(err);
				return false;
			}
			var searchHash = $('.ex-reply-form input[name=requestHash]').attr('value');
			var search = {
				'postSubmit':1,
				'requestHash':searchHash,
				'requestFrom':'',
				'query':url
			}
			request({
				url:'http://www.coolapk.com/do?c=faxian&m=load&ajaxRequest=1&'+moment().valueOf(),
				method:'post',
				form:search,
				jar:j
			},function(err,_res,_body){
				if(err || !_body){
					var err = {
						status : 101,
						msg : "未找到游戏资源."
					}
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
				var $ = cheerio.load(_body);
				if($('.form-group .ex-screenshot-thumb-carousel img').length == 0 ){
					var err = {
						status : 101,
						msg : "未找到游戏资源."
					}
					deffered.reject(err);
					return false;
				}
				var imgQueue = [];
				_.map($('.form-group .ex-screenshot-thumb-carousel img'),function(img){
					imgQueue.push(downloadImage($(img).attr('src')));
				});
				
				q.all(imgQueue).then(function(results){
					var title = $('#titleFormGroup #titleInput').val();
					var description = $('#messageFormGroup #messageInput').text();
					if(title && description){
						var result = {
							title:title,
							description:description,
							img:imgQueue,
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
		});
		return deffered.promise;
	}
}

/**
 * 登陆酷安网，并储存cookie
 * @return {promise}     [成功：获取到的cookie||失败：错误信息]
 */
function getLoginCookies(){
	var j;
	if(global.j){
		j = global.j
	}else{
		j = request.jar();
		global.j = j;
	}

	var deffered = q.defer();
	request({
		url:'http://www.coolapk.com/account/login',
		method:'get',
		jar:j
	},function(err,_res,body){
		if(err || !body){
			var err = {
				status : 103,
				msg : "游戏资源获取失败，请联系管理员."
			}
			deffered.reject(err);
			return false;
		}
		if(_res.statusCode == 404){
			var err = {
				status : 103,
				msg : "游戏资源获取失败，请联系管理员."
			}
			deffered.reject(err);
		}
		var $ = cheerio.load(body);
		if($('.form-signin input[name=requestHash]').length == 0 ){
			var err = {
				status : 103,
				msg : "游戏资源获取失败，请联系管理员."
			}
			deffered.reject(err);
		}
		var requestHash = $('.form-signin input[name=requestHash]').attr('value');
		var data = {
			'postSubmit':1,
			'requestHash':requestHash,
			'requestForward':'',
			'openId_type':'',
			'openId_auth':'',
			'forward':'http://www.coolapk.com/',
			'login':'dfgjyicc@163.com',
			'password':'adsf4679',
			'remember':'1'
		}
		request({
			url:'http://www.coolapk.com/do?c=account&m=login&ajaxRequest=1&'+moment().valueOf(),
			method:'post',
			form:data,
			jar:j
		},function(err,__res,_body){
			if(err){
				err.status = 103;
				err.msg = "游戏资源获取失败，请联系管理员.";
				deffered.reject(err);
				return false;
			}
			if(__res.statusCode == 404){
				var err = {
					status : 103,
					msg : "游戏资源获取失败，请联系管理员."
				}
				deffered.reject(err);
			}
			deffered.resolve(j);
		});
	});
	return deffered.promise;
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

module.exports = fetch;