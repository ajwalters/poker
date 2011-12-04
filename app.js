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
  , gameSocketServers = {}
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


global.crypto = require('crypto');

// make sockjs globally available for creating new socker servers
app.sockjs = sockjs;
// need global mapping of gameId => socket server
app.gameSocketServers = gameSocketServers;

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

app.get("/games/:id", function(req, res){
  var gameId = req.params.id;
  console.log("Game ID: "+ gameId);

  // If no socket exists for this game, create one and store for later use
  if(!app.gameSocketServers[gameId]){
    var sockjs_opts = {sockjs_url: "http://majek.github.com/sockjs-client/sockjs-latest.min.js"};
    var server = app.sockjs.createServer(sockjs_opts);

    server.on('connection', function(conn) {
      console.log("Game "+ gameId + ": Received connection");

      server.on('hello', function(){
        console.log("Game "+ gameId + ": received broadcast 'hello'");
        conn.write("Hello!");
      });
    });

    server.installHandlers(app, {prefix:'[/]game_socket/' + gameId});
    app.gameSocketServers[gameId] = server;
  }

  res.render('games/show',{
      title: 'Game #'+ gameId
    , gameId: gameId
  });
});

app.get("/games/:id/response", function(req, res){
  var gameId = req.params.id;
  var gameServer = gameSocketServers[gameId];
  gameServer.emit("hello");
  console.log("About to broadcast to all listeners on Game: "+ gameId);
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });
  res.end("OK");
});
