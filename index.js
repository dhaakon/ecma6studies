'use strict';

class Tasks{
  constructor(){
  
  }
}

var express = require('express');
var app = express();

app.set('view engine', 'jade');

app.use(express.static( __dirname + '/public'));

app.get('/', (req, res) => {
  res.render('index');
});

var server = app.listen( process.env.PORT || 3000, function(){

});
