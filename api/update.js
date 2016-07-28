var AV      = require('../cloud/av.js');
var router  = require('express').Router();
var q 		= require('q');
var _ 		= require('lodash');
var moment  = require('moment');
var crypto  = require('crypto');
var signKey = require('../config/config.js').signKey;


router.post('/delete',function(req,res){
	var discoverId = req.body.discoverId;
	var userId = req.body.userId;

	var sign = req.body.sign;

	if(sign == crypto.createHash('md5').update(userId+''+signKey,'utf-8').digest('hex')){

		var Discover = global.Discover;
		var query = new AV.Query(Discover);

		query.equalTo('discoverId',parseInt(discoverId));

		query.first().then(function(discover){
			
			if(discover){

				if(userId == "938953" || discover.get("userId") == userId){
					
					discover.destroy().then(function(result){
						var results = {
							discover:result,
							"status":0,
							"msg":'ok'
						}
						res.json(results);
					},function(err){
						err.set("status",108);
						err.set("msg",'删除发现失败,请检查后重试');
						res.json(err);
					});
				}else{
					var err = {
						status : 107,
						msg : '用户ID与发现不匹配,删除失败'
					}
					res.json(err);
				}

				
			}else{
				var err = {
					status : 106,
					msg : '未查询到要删除的发现'
				}
				res.json(err);
			}
		},function(err){
			err.set("status",105);
			err.set("msg",'查询发现失败,请检查后重试');
			res.json(err);
		});
	}else{
		err.set("status",109);
		err.set("msg",'sign错误,请检查后重试');
		res.json(err);
	}
});


/**
 * 发现修改入口
 */
router.post('/',function(req,res){
	var discoverId = req.body.discoverId;

	var sign = req.body.sign;

	req.body.img = req.body.img.split(',');

	var params = req.body;

	delete params.discoverId;

	if(sign == crypto.createHash('md5').update(params.userId+''+signKey,'utf-8').digest('hex')){
		var Discover = global.Discover;
		var query = new AV.Query(Discover);

		query.equalTo('discoverId',parseInt(discoverId));

		query.first().then(function(discover){
			
			if(discover){

				if(discover.get("userId") == params.userId){
					delete params.userId;
					_.each(params,function(value,key){
						discover.set(key,value);
					});
					
					discover.save().then(function(result){
						var results = {
							discover:result,
							"status":0,
							"msg":'ok'
						}
						res.json(results);
					},function(err){
						err.set("status",103);
						err.set("msg",'修改发现失败,请检查后重试');
						res.json(err);
					});
				}else{
					var err = {
						status : 104,
						msg : '用户ID与发现不匹配,修改失败'
					}
					res.json(err);
				}

				
			}else{
				var err = {
					status : 102,
					msg : '未查询到要修改的发现'
				}
				res.json(err);
			}
		},function(err){
			err.set("status",101);
			err.set("msg",'查询发现失败,请检查后重试');
			res.json(err);
		});
	}else{
		err.set("status",109);
		err.set("msg",'sign错误,请检查后重试');
		res.json(err);
	}
});

module.exports = router;