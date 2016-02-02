import { AnimatedPath } from './animatedPath.jsx';

var json = require("../../json/logo.json");

var SVG = require('svg.js');
var _svg = SVG('svg');

function *shapes( json ){
  var clean = function( shape, parent ){

    if(!shape.shape){
      for(var child in shape.children){
        var _tmp = shape.children[child];
        clean(_tmp, parent);
      }
    }else{
      parent.push(shape);
    }
    //return (shape.children) ? shape : clean(shape);
  }

  for( var object in json ){
    var _obj = json[object];
    _obj.gfx = [];

    var a = clean(_obj, _obj.gfx);
    delete _obj.children;

    yield _obj;
  }
}

class GFXChildren{
  constructor( length ){
    this.children = [];
  }

  // Add the SVG group 
  add(child){
    this.children.push(child);
  }
  get groups(){
    return this;
  }
}

class Group {
  constructor ( data ){
  
  }
}


class LogoRenderer {
  constructor ( canvas ){
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    this.setupGraphics();
  }

  draw( obj, idx, arr ){
    let shape = obj.shape;
    let _d = shape.d || shape.path;

    var p = new AnimatedPath( obj, this.canvas );

    this.paths.push( p );

    //p.draw();
  }

  setupGraphics () {
    //var gen = cleanJSON(json);
    var gfx = json.letters.children;

    for( let obj of shapes( gfx ) ){
      obj.gfx.forEach( (el, idx, arr) => this.draw(el) );
    }

    this.animate();
  }

  animate(){
    for( var path in this.paths ){
      var _path = this.paths[path];
      var pt = _path.update();
      var p = new Path2D();

      p.moveTo( pt.x, pt.y );
      p.arc( pt.x, pt.y, 1, 0, Math.PI * 2);
      
      this.ctx.stroke( p );
    }
    this.ctx.fillStyle = 'rgba( 255, 255, 255, 1 )';
    this.ctx.fillRect(0,0,this.canvas.width, this.canvas.heigth);

    window.requestAnimationFrame( ()=> this.animate() );
  }
}

var _proto = LogoRenderer.prototype;
_proto.graphics = new GFXChildren(0);
_proto.paths = [];

export { LogoRenderer, Group }
