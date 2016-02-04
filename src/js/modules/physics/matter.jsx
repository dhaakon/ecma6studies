let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;


class Physics {
  constructor( canvas ){
    let renderOptions = {
      render:{
        element: canvas,
        //controller: Matter.RenderPixi,
        options:{
          width:1900,
          height:900,
          showBounds: true,
          showDebug: true,
          showPositions: true,
          hasBounds: true
        }
      }
    }

    this.engine = Engine.create( renderOptions );

    this.engine.render.options.hasBounds = true;
    // create two boxes and a ground
    // add all of the bodies to the world

    this.canvas = canvas;

    // run the engine
    Engine.run( this.engine );
  }

  createWorld(){
  }

  createBodies(){
  }

  addVertex( polygons ){
    console.log(polygons);
    polygons.sort();
    
    var options = {
      isStatic: true,
      strokeStyle:'#ff00000',
      showBounds: true
    };

    for( var polygon in polygons){
      var poly = polygons[polygon];
      poly.sort( function( a, b ) {
        return a.x - b.x;
      });

      var body = Matter.Body.create( options );
      var _vert = Matter.Vertices.create( poly, body );

      var _p = poly[2];
      var _body = Bodies.fromVertices( _p.x, _p.y, _vert, options );

      var _px = _p.x - _body.vertices[1].x;
      var _py = _p.y - _body.vertices[1].y;
      var vector = Matter.Vector.create(_px, _py);

      //var _px = 0, _py = 0;

      World.add( this.engine.world, _body );

      console.log(poly);
      var i = 0;

      console.log(poly[0].x, poly[0].y);

      Matter.Body.translate( _body, vector );

      while( i < 3 ){
        var __vert = _body.vertices[i];

        var vx = __vert.x;
        var vy = __vert.y;
        var __px = poly[i].x - vx;
        var __py = poly[i].y - vy;

        console.log('-----');
        console.log('x');
        console.log(vx, poly[i].x, __px);
        console.log('y');
        console.log(vy, poly[i].y, __py);

        ++i;
      }
    }

  }

  get physicsCanvas(){
    return this.engine.render.canvas;
  }
}

let proto = Physics.prototype;
export { Physics }

