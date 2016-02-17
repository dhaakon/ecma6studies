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
  constructor ( obj, canvas ){
    this.canvas = canvas;
    this.gfx = obj.gfx;
    this.id = obj.id;

    this.paths = [];

    this.gfx.forEach( (el, idx, arr ) => {this.create(el)})

    this.getBBox();

  }

  create( obj, idx, array ){
    let shape = obj.shape;
    let _d = shape.d || shape.path;

    var p = new AnimatedPath( obj, this.canvas );

    this.paths.push( p );
  }

  getBBox(){
    console.log('------');
    console.log(this.paths.length);
    
    if (this.paths.length == 1) {
      var bb = this.paths[0].bbox;
      this.x1 = bb.x1;
      this.x2 = bb.x2;
      this.y1 = bb.y1;
      this.y2 = bb.y2;

      this.width = bb.width;
      this.height = bb.height;
    }else{
      var x1, x2, y1, y2;

      for( var _path in this.paths ){
        let _p = this.paths[_path];
        let bb = _p.bbox;

        x1 = (x1 !== undefined) ? x1 : bb.x1;
        x2 = (x2 !== undefined) ? x2 : bb.x2;
        y1 = (y1 !== undefined) ? y1 : bb.y1;
        y2 = (y2 !== undefined) ? y2 : bb.y2;

        x1 = (x1 < bb.x1) ? x1 : bb.x1;
        x2 = (x2 > bb.x2) ? x2 : bb.x2;
        y1 = (y1 < bb.y1) ? y1 : bb.y1;
        y2 = (y2 > bb.y2) ? y2 : bb.y2;
      }

      this.x1 = x1;
      this.x2 = x2;
      this.y1 = y1;
      this.y2 = y2;

      let r = Math.round;

      this.width = r(x2 - x1);
      this.height = r(y2 - y1);    
     }
  }

}

Group.prototype.paths = []

class LogoRenderer {
  constructor ( canvas ){
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    this.setupGraphics();
  }

  draw( obj, idx, arr ){

    //p.draw();
  }

  setupGraphics () {
    //var gen = cleanJSON(json);
    var gfx = json.letters.children;

    for( let obj of shapes( gfx ) ){
      var _group = new Group( obj, this.canvas );
      this.groups.push(_group);
    }
  }

  animate(){
    /*
    for( var path in this.paths ){
      var _path = this.paths[path];
      var pt = _path.update();
      var p = new Path2D();

      p.moveTo( pt.x, pt.y );
      p.arc( pt.x, pt.y, 1, 0, Math.PI * 2);
      
      this.ctx.stroke( p );
    }
    this.ctx.fillStyle = 'rgba( 255, 255, 255, 1 )';
    //this.ctx.fillRect(0,0,this.canvas.width, this.canvas.heigth);
    //*/

    window.requestAnimationFrame( ()=> this.animate() );
  }
}

var _proto = LogoRenderer.prototype;
_proto.graphics = new GFXChildren(0);
_proto.paths = [];
_proto.groups = [];

export { LogoRenderer, Group }
