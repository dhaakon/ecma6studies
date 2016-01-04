(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
  * domready (c) Dustin Diaz 2014 - License MIT
  */
!function (name, definition) {

  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()

}('domready', function () {

  var fns = [], listener
    , doc = document
    , hack = doc.documentElement.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , loaded = (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState)


  if (!loaded)
  doc.addEventListener(domContentLoaded, listener = function () {
    doc.removeEventListener(domContentLoaded, listener)
    loaded = 1
    while (listener = fns.shift()) listener()
  })

  return function (fn) {
    loaded ? setTimeout(fn, 0) : fns.push(fn)
  }

});

},{}],2:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var domready = require('domready');

// functionality

var Grid = (function () {
  function Grid(canvas) {
    _classCallCheck(this, Grid);

    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    this.setup();
  }

  _createClass(Grid, [{
    key: 'setup',
    value: function setup() {
      this.ctx.strokeStyle = "rgba( 0, 0, 255, 0.4)";
      this.ctx.lineWidth = 0.5;
    }
  }, {
    key: 'draw',
    value: function draw() {
      var i = 1;

      var xSpacing = this.size.width / this.amount;
      var ySpacing = this.size.height / this.amount;

      while (i < this.amount) {
        var sx, sy;

        sx = 0;
        sy = 0;

        this.ctx.beginPath();
        this.ctx.moveTo(i * xSpacing, 0);
        this.ctx.lineTo(i * xSpacing, this.size.height);

        this.ctx.moveTo(0, i * ySpacing);
        this.ctx.lineTo(this.size.width, i * ySpacing);
        this.ctx.stroke();

        ++i;
      }
    }
  }, {
    key: 'size',
    get: function get() {
      return {
        width: this.canvas.width,
        height: this.canvas.height
      };
    }
  }]);

  return Grid;
})();

// properties

var _proto = Grid.prototype;
_proto.amount = 23;

domready(function () {
  var _grid = new Grid(document.getElementById('sketch'));

  _grid.draw();
});

exports.Grid = Grid;

},{"domready":1}]},{},[2]);
