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

  new LogoAnimation( _canvas );
});


