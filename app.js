
/**
 * U77发现系统Resetful后端系统
 *
 * @author Vcing
 * @Date(2015/12/21)
 */

'use strict';

var domain       = require('domain');
var express      = require('express');
var path         = require('path')
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var config       = require('./config/config.js');
var AV           = require('leanengine');
var api          = require('./api');
var app          = express();


// 使用 LeanEngine 中间件
app.use(AV.Cloud);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	type: function(req) {
		return /x-www-form-urlencoded/.test(req.headers['content-type']);
	},
	extended: false
}));

app.use(cookieParser());


app.use(express.static('public'));

// 跨域支持
app.all('/api/*', (req, res, next) => {
  var origin = req.headers.origin;
  if (config.whiteOrigins.indexOf(origin) !== -1) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  }
  next();
});

// 路由
app.use('/api',api);

app.get('/',function(req,res){
  res.redirect('http://www.u77.com');
});


// 如果是开发环境，则将异常堆栈输出到页面，方便开发调试
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) { // jshint ignore:line
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: err
    });
  });
}

// 如果是非开发环境，则页面只输出简单的错误信息
app.use(function(err, req, res, next) { // jshint ignore:line
  res.status(err.status || 500);
  res.send({
    message: err.message,
    error: {}
  });
});

module.exports = app;