#!/usr/bin/env node

var _ = require('underscore')
  , express = require('express')
  , Resource = require('express-resource')
  , Redis = require('redis')
  , RedisStore = require('connect-redis')(express)
  , Pivotal = require('pivotal-tracker')
  , mongoose = require('mongoose')
  , everyauth = require('everyauth')
  , app = module.exports = express.createServer()
  , sockjs = require('sockjs')
  , sockjs_opts = {sockjs_url: "http://majek.github.com/sockjs-client/sockjs-latest.min.js"}
  , dir = __dirname
  , sjs = sockjs.createServer(sockjs_opts)
  , app_root = dir + '/app'
  , conf = {
         express: express
       , Resource: Resource
       , Redis: Redis
       , RedisStore: RedisStore
       , everyauth: everyauth
       , paths: {
           'dir'          : dir
         , 'views'        : app_root + '/views'
         , 'controllers'  : app_root + '/controllers'
         , 'lib'          : dir + '/lib'
       }
       , app: app
  };

sjs.installHandlers( app, {prefix:'[/]sock'} );

global.crypto = require('crypto');

app.sjs = sjs;
app.db = mongoose;
app.port = process.env.PORT || 3000;

// Global objects
global.app = app;
global._ = _;
// Models
require('./config/models.js').config(conf);
// Configuration
require('./config/app.js').config(conf);
// Routes
require('./config/routes.js').routes(conf);

//Index resources
app.listen(app.port);
console.log("Pivotal Poker:\nlistening on port %d in %s mode", app.address().port, app.settings.env);

// Walters' playground
console.log("--- Walters' Playground ---");

app.sjs.on('connection', function(conn) {
  console.log("sockjs: Received connection");
  app.sjs.on('foo', function(){
    console.log("sockjs: Replying to a foo command");
    conn.write(["sockjs: received a foo event", conn]);
  });
  conn.on('data', function(data) {
    // conn.write(message);
    console.log("sockjs: Received message: ", data);
    console.log("sockjs: foo value:", data.event);
    if(data.event == "reply"){
      conn.write("here's your stinking reply");
    }
  });
});

app.get("/test", function(req, res){
  console.log(app.sjs);

  app.sjs.emit("foo");
  // app.sjs.emit("foo", { first : "parameter!" });
  // app.sjs.on("connection", function(conn){

  //   conn.on("data", function(message){
  //     console.log("conn:", conn);
  //     console.log("message:", message);
  //   });

  // });
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  res.end("OK");
});

