var SVG = require('svg.js');
var _svg = SVG('svg');

var simplify = require('simplify-path')
var normalize = require('normalize-path-scale')
var contours = require('svg-path-contours')
var triangulate = require('triangulate-contours')
var parse = require('parse-svg-path');
var getBBox = require('svg-path-bounding-box');

var matterSVG = Matter.Svg;

class AnimatedPath{
  constructor( obj, canvas ){
    this.d = obj.shape.d || obj.shape.path;
    this.canvas = canvas;
    this.fill = obj.fill || 'black';

    this.pointSize = 2;

    this.ctx = this.canvas.getContext('2d');

    this._svg = _svg.path(this.d);
    this._node = this._svg.node;
    this._path2d = new Path2D( this.d );


    this.index = 0;
    this.dt = 0;
    this.index = 0;
  }

  draw(){
    this.ctx.fillStyle = this.fill || 'black';
    this.ctx.stroke( this._path2d );
  }

  getPointAtLength( length ){
    return this._node.getPointAtLength( length );
  }

  update(){
    this.render( this.canvas.getContext('2d'), this.canvas.width, this.canvas.height, this.dt );

    if(this.currentPoint++ > this.totalLength){
      this.currentPoint = 0;
    }

    var pt = this.getPointAtLength( this.currentPoint );

    return pt;
  }

  render( ctx, width, height, dt ) {
    this.timer += dt;

    if( this.timer > 1000 ){
      this.timer = 0;
      this.index++;
      update();
    }

    ctx.fillStyle = '#121212'
    ctx.globalAlpha = 0.9
    ctx.save()
    ctx.lineWidth = 1;

    var fn = function(m){
      return m.positions.length > 0;
    };

    var _triangles = this.getTriangles(this.contours, this.threshold);

    ctx.save();
    ctx.translate( 0, 0 );
    ctx.beginPath();

    this.drawTriangles(ctx, _triangles);
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.stroke();
    ctx.restore();
  }

  drawTriangles(ctx, complex){
    var v = complex.positions

    complex.cells.forEach( (f)=> {
        var v0 = v[f[0]],
            v1 = v[f[1]],
            v2 = v[f[2]]

        var p1, p2, p3;

        ctx.beginPath();
        ctx.moveTo(v0[0], v0[1])

        var _s = 5;
        p1 = new Path2D()
        p1.moveTo( v1[0], v1[1] );
        p1.arc( v1[0], v1[1], _s, 0, 2 * Math.PI );

        p2 = new Path2D()
        p2.moveTo( v2[0], v2[1] )
        p2.arc( v2[0], v2[1], _s, 0, 2 * Math.PI );

        p3 = new Path2D()
        p3.moveTo( v0[0], v0[1] )
        p3.arc( v0[0], v0[1], _s, 0, 2 * Math.PI );

        ctx.lineTo(v1[0], v1[1]);
        ctx.lineTo(v2[0], v2[1]);
        ctx.lineTo(v0[0], v0[1]);

        ctx.strokeStyle = "green";
        ctx.stroke();
        ctx.closePath();
        ctx.save();

        ctx.closePath();
        ctx.beginPath();
        ctx.fillStyle = 'rgba( 255,0,0, 1)';
        ctx.stroke(p1);
        ctx.fill(p1);
        ctx.closePath();

        ctx.fillStyle = 'rgba(0,255,0,1)';
        ctx.beginPath();
        ctx.stroke(p2);
        ctx.fill(p2);
        ctx.closePath();

        ctx.fillStyle = 'rgba( 0, 0, 255, 1)';
        ctx.beginPath();
        ctx.stroke(p3);
        ctx.fill(p3);
        ctx.closePath();

        ctx.restore();
    })
  }

  getPolygons( complex ){
    var v = complex.positions;
    var polygons = [];

    var fn = ( f )=>{
      var v0 = v[f[0]],
          v1 = v[f[1]],
          v2 = v[f[2]];

      var x1, y1;
      var x2, y2;
      var x3, y3;

      var p1, p2, p3;

      p1 = { x: Math.floor(v1[0]), y:Math.floor(v1[1]) };
      p2 = { x: Math.floor(v2[0]), y:Math.floor(v2[1]) };
      p3 = { x: Math.floor(v0[0]), y:Math.floor(v0[1]) };

      var t = [ p1, p2, p3 ];
      polygons.push( t );
    }

    complex.cells.forEach( fn );

    return polygons;
  }


  toMesh( contents ){
    var threshold = 2;
    var scale = 10;
  }

  get contours(){
    return contours( parse( this.d ) );
  }

  getTriangles( contours, threshold ){
    let fn = ( path ) => {
      return simplify( path, threshold );
    }

    var lines = contours.map( fn );

    var c = triangulate(lines);
    //c.positions = normalize( c.positions );
    return c;
  }

  get bbox(){
    return getBBox( this.d );
  }

  get x(){
    return this.bbox.x1;
  }

  get y(){
    return this.bbox.y1;
  }

  get matterPath(){
    return matterSVG.pathToVertices( this.d, 30 );
  }

  get width(){
    return this.bbox.width;
  }

  get height(){
    return this.bbox.height;
  }

  get svgNode(){
    return this._node;
  }

  get totalLength(){
    return ~~this._node.getTotalLength()
  }
}

var proto = AnimatedPath.prototype;
proto.threshold = 8;

proto.currentPoint = 0;


export { AnimatedPath }
