var domready = require('domready');

import "babel-polyfill";

import { Grid } from './modules/grid.jsx'
import { View } from './modules/view.jsx'
import { Plotter } from './modules/plotter.jsx'
import { LogoAnimation } from './modules/animation/logo.jsx'
import { Physics } from './modules/physics/matter.jsx'

domready( function(){
  var canvas = document.getElementById('sketch');
  //let _grid = new Grid( canvas );
  //_grid.draw();
  //
  var _physics = new Physics( canvas );
  var _canvas = _physics.physicsCanvas;

  var _l = new LogoAnimation( _canvas );

  let animatedPaths = _l.graphics.paths;

  for ( var path in animatedPaths ){
    var _path = animatedPaths[path];
    var _polygons = _path.getPolygons( _path.getTriangles( _path.contours, _path.threshold ) );

    _physics.addVertex( _polygons );
  }
});


