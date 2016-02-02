var domready = require('domready');

import "babel-polyfill";

import { Grid } from './modules/grid.jsx'
import { View } from './modules/view.jsx'
import { Plotter } from './modules/plotter.jsx'
import { LogoAnimation } from './modules/animation/logo.jsx'

domready( function(){
  var canvas = document.getElementById('sketch');
  //let _grid = new Grid( canvas );
  //_grid.draw();

  new LogoAnimation( canvas );
});


