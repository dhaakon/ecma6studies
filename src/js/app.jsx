var domready = require('domready');

import "babel-polyfill";

import { Grid } from './modules/grid.jsx'
import { View } from './modules/view.jsx'
import { Plotter } from './modules/plotter.jsx'
import { LogoAnimation } from './modules/animation/logo.jsx'
import { Physics } from './modules/physics/matter.jsx'

import { ThreeD } from './modules/threed/threed.jsx'

domready( function(){
  var element = document.getElementById('sketch');

  var _canvas = document.createElement('canvas');
  _canvas.width = 1900;
  _canvas.height = 900;

  element.appendChild( _canvas );

  var _threeD = new ThreeD( _canvas );


  //let _grid = new Grid( canvas );
  //_grid.draw();
  var _l = new LogoAnimation( _canvas );
  let animatedPaths = _l.graphics.paths;

  for ( var path in animatedPaths ){
    var _path = animatedPaths[path];

    _threeD.create( _path.d );
  }
  
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


