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

var _grid2 = require('./modules/grid.jsx');

var _view = require('./modules/view.jsx');

var _plotter = require('./modules/plotter.jsx');

var _logo = require('./modules/animation/logo.jsx');

var domready = require('domready');

domready(function () {
  var canvas = document.getElementById('sketch');
  var _grid = new _grid2.Grid(canvas);
  _grid.draw();

  new _logo.LogoAnimation(canvas);
});

},{"./modules/animation/logo.jsx":5,"./modules/grid.jsx":6,"./modules/plotter.jsx":7,"./modules/view.jsx":8,"domready":1}],3:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var json = require("../json/logo.json");

var GFXChildren = (function () {
  function GFXChildren(length) {
    _classCallCheck(this, GFXChildren);

    this.children = [];
    console.log(this.groups);
  }

  _createClass(GFXChildren, [{
    key: 'push',
    value: function push(child) {
      this.children.push(child);
    }
  }, {
    key: 'groups',
    get: function get() {
      console.log(new Array(10).join('-'));
      console.log('children');
      console.log(this);
      console.log(new Array(10).join('-'));
      return this;
    }
  }]);

  return GFXChildren;
})();

var Group = function Group(data) {
  _classCallCheck(this, Group);

  console.log(data);
};

var LogoRenderer = (function () {
  function LogoRenderer(canvas) {
    _classCallCheck(this, LogoRenderer);

    this.canvas = canvas;
    this.setupGraphics();
  }

  _createClass(LogoRenderer, [{
    key: 'setupGraphics',
    value: function setupGraphics() {
      for (var object in json) {
        var _main = json[object];
        for (var group in _main) {
          var gfx = _main[group];
          var _g = new Group(gfx);

          this.graphics.push(_g);
        }
      }

      console.log(this.graphics.groups);

      window.graphics = this.graphics;
    }
  }]);

  return LogoRenderer;
})();

var _proto = LogoRenderer.prototype;
_proto.graphics = new GFXChildren(0);

exports.LogoRenderer = LogoRenderer;
exports.Group = Group;

},{"../json/logo.json":4}],4:[function(require,module,exports){
module.exports={"letters":{"children":[{"shape":{"type":"polyline","points":[{"x":686.5,"y":184},{"x":515,"y":184.5},{"x":599.5,"y":1},{"x":686.5,"y":184}]},"fill":"#FF3000","id":"A"},{"children":[{"name":"s2","children":[{"shape":{"type":"circle","cx":401.833,"cy":179.834,"r":4.5}},{"shape":{"type":"circle","cx":441.833,"cy":97.834,"r":4.5}},{"shape":{"type":"circle","cx":403.833,"cy":97.834,"r":4.5}},{"shape":{"type":"circle","cx":442.833,"cy":25.834,"r":4.5}},{"shape":{"type":"polyline","points":[{"x":401.917,"y":178.5},{"x":441.834,"y":98},{"x":404,"y":98},{"x":443.834,"y":25.083}]},"stroke":{"color":"#000000","width":"2","style":"Solid"}}]},{"name":"s1","children":[{"shape":{"type":"circle","cx":392.833,"cy":160.834,"r":4.5}},{"shape":{"type":"circle","cx":394.833,"cy":78.834,"r":4.5}},{"shape":{"type":"circle","cx":432.833,"cy":78.834,"r":4.5}},{"shape":{"type":"circle","cx":433.833,"cy":6.834,"r":4.5}},{"shape":{"type":"polyline","points":[{"x":393.917,"y":159.5},{"x":433.834,"y":79},{"x":396,"y":79},{"x":435.834,"y":6.083}]},"stroke":{"color":"#000000","width":"2","style":"Solid"}}]}],"id":"SS"},{"shape":{"type":"path","path":"M235.833,2.667c-50.35,0-91.167,40.817-91.167,91.167c0,50.35,40.817,91.166,91.167,91.166 S327,144.184,327,93.834C327,43.484,286.183,2.667,235.833,2.667z M236.167,131.666c-21.448,0-38.833-17.386-38.833-38.833 c0-21.447,17.386-38.833,38.833-38.833C257.614,54,275,71.386,275,92.833C275,114.28,257.614,131.666,236.167,131.666z"},"fill":"#FFC000","id":"O_1_"},{"children":[{"shape":{"type":"polyline","points":[{"x":2,"y":95},{"x":2,"y":2},{"x":104.334,"y":45.668},{"x":2,"y":95}]},"fill":"#80CFCB"},{"shape":{"type":"polyline","points":[{"x":104.334,"y":135.668},{"x":2,"y":185},{"x":2,"y":92}]},"fill":"#80CFCB"}],"id":"B"}]}}
},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LogoAnimation = undefined;

var _renderer = require('../../graphics/renderer.jsx');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LogoAnimation = function LogoAnimation() {
  _classCallCheck(this, LogoAnimation);

  this.graphics = new _renderer.LogoRenderer();
};

exports.LogoAnimation = LogoAnimation;

},{"../../graphics/renderer.jsx":3}],6:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// functionality

var Grid = (function () {
  function Grid(canvas) {
    _classCallCheck(this, Grid);

    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    this.setup();
  }

  _createClass(Grid, [{
    key: "setup",
    value: function setup() {
      this.ctx.strokeStyle = "rgba( 0, 0, 255, 0.4)";
      this.ctx.lineWidth = 0.5;
    }
  }, {
    key: "draw",
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
    key: "size",
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
_proto.amount = 100;

exports.Grid = Grid;

},{}],7:[function(require,module,exports){
"use strict";

},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var View = function View() {
  _classCallCheck(this, View);
};

exports.View = View;

},{}]},{},[2,3,5,6,7,8]);
