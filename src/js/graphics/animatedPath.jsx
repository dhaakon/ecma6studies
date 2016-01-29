var SVG = require('svg.js');
var _svg = SVG('svg');

class AnimatedPath{
  constructor( obj, canvas ){
    this.d = obj.shape.d || obj.shape.path;
    this.canvas = canvas;
    this.fill = obj.fill || 'black';

    this.pointSize = 2;

    this.ctx = this.canvas.getContext('2d');

    this._node = _svg.path(this.d).node;
    this._path2d = new Path2D( this.d );
  }

  draw(){
    this.ctx.fillStyle = this.fill || 'black';
    this.ctx.stroke( this._path2d );
  }

  getPointAtLength( length ){
    return this._node.getPointAtLength( length );
  }

  update(){
    if(this.currentPoint++ > this.totalLength){
      this.currentPoint = 0;
    }

    var pt = this.getPointAtLength( this.currentPoint );

    return pt;
  }

  get svgNode(){
    return this._node;
  }

  get totalLength(){
    return ~~this._node.getTotalLength()
  }
}

var proto = AnimatedPath.prototype;

proto.currentPoint = 0;


export { AnimatedPath }
