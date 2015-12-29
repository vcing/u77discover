var router   = require('express').Router();
var fetch    = require('./fetch.js');
var discover = require('./discover.js');
var request  = require('request');
var cheerio = require('cheerio');

router.use('/fetch',fetch);
router.use('/discover',discover);

router.get('/test',function(req,res){
	var data = {postSubmit:1,
				requestHash:'8d5dbfb9o03ycy',
				requestFrom:'',
				query:'http://www.wandoujia.com/apps/com.duolingo'};
	request({
			url:"http://www.coolapk.com/do?c=faxian&m=load&ajaxRequest=1&1451372775942",
			encoding:null,
			method:'post',
			timeout:3000,
			form:data
		},function(err,_res,body){
			console.log(body);
			res.send(body);
		});
	
});

module.exports = router;