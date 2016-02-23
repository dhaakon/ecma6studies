import "babel-polyfill";
require("babel-core/register");

var domready = require('domready');


import { Grid } from './modules/grid.jsx'
import { View } from './modules/view.jsx'
import { Plotter } from './modules/plotter.jsx'
import { LogoAnimation } from './modules/animation/logo.jsx'
import { Physics } from './modules/physics/matter.jsx'

import { ThreeD } from './modules/threed/threed.jsx'

domready( function(){
  var element = document.getElementById('sketch');

  var _canvas = document.createElement('canvas');
  _canvas.width = window.innerWidth;
  _canvas.height = window.innerHeight;

  element.appendChild( _canvas );

  var _threeD = new ThreeD( _canvas );


  //let _grid = new Grid( canvas );
  //_grid.draw();
  var _l = new LogoAnimation( _canvas );
  let groups = _l.graphics.groups;

  for( var _group in groups ){
    var _g = groups[_group];


    for( var _p in _g.paths ){
      var _path = _g.paths[_p];
      _path.bWidth = _g.width;
      _path.bHeight = _g.height;

      console.log(_path);

      _threeD.create( _path );
    }
  }



  //for ( var path in animatedPaths ){
    //var _path = animatedPaths[path];

    //_threeD.create( _path.d );
  //}

  
  //_threeD.explode();
  
  /*
  var _physics = new Physics( canvas );
  var _canvas = _physics.physicsCanvas;
  

  for ( var path in animatedPaths ){
    var _path = animatedPaths[path];
    var _polygons = _path.getPolygons( _path.getTriangles( _path.contours, _path.threshold ) );

    _physics.addVertex( _polygons );
  }
  */
});


