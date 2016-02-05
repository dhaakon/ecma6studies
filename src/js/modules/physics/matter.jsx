let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;


class Physics {
  constructor( canvas ){
    let renderOptions = {
      render:{
        element: canvas,
        controller: Matter.RenderPixi,
        options:{
          width: this.width,
          height: this.height,
          background:"#ffffff",
          wireframes:false
          //showBounds: true,
          //showDebug: true,
          //showPositions: true,
          //hasBounds: true
        }
      }
    }

    this.engine = Engine.create( renderOptions );

    //this.engine.render.options.hasBounds = true;
    // create two boxes and a ground
    // add all of the bodies to the world

    this.canvas = canvas;
    this.setupEvents();
    this.createWorld();
    this.createBodies();

    // run the engine
    Engine.run( this.engine );
  }

  setupEvents(){
    Matter.Events.on( this.engine.render, "afterRender", this.afterRender);
    Matter.Events.on( this.engine.render, "beforeRender", this.beforeRender);

  }
  beforeRender( event ){
  }
  afterRender( event ){
  }

  createWorld(){
    //var ground = Bodies.rectangle(this.width/2, this.height - 25, this.width, 50, { isStatic: true });
    //World.add( this.engine.world, ground );
  }

  createBodies(){
    let fn = ()=> {
      var min = 5;
      var max = 50;
      var _size = Math.max( min, Math.random() * max );

      var options = {
        mass: _size,
        restitution: 0.25
      };

      var body = Bodies.circle( Math.random() * this.width, Math.min( -50, Math.random() * -500 ), _size, options);
      World.add( this.engine.world, body );
    }

    var rate = 5000;
    var m = 1000/60;
    var _interval = setInterval( fn, rate/m );
  }

  addVertex( polygons ){
    polygons.sort();
    var options = {
      isStatic: true,
      showBounds: true,
      restitution: 0.5,
      density: 100,
      //fillStyle:"black"
      //mass: Math.random() * 5,
      render:{
        fillStyle:'black',
        strokeStyle:'black',
        lineWidth: 0,
        lineCap:'round'
      }
    };

    for( var polygon in polygons){
      var poly = polygons[polygon];
      poly.sort( function( a, b ) {
        var x1 = b.x - a.x;

        //return x1;
        return x1 == 0 ? a.y - b.y : a.x - b.x;
      });

      poly.forEach( (p)=> console.log( p.x, p.y));


      var body = Matter.Body.create( options );
      var _vert = Matter.Vertices.create( poly, body );

      var _body = Bodies.fromVertices( 0, 0, _vert, options );
      _body.render.fillStyle = 'black';
      Matter.Body.set( _body, 'frictionAir', 1.95);

      var num = 0;
      var _p = poly[ num ];

      var _c = Matter.Vertices.centre( _vert );
      var _cx = _c.x, _cy = _c.y;

      var _px = _p.x;
      var _py = _p.y;

      var vector = Matter.Vector.create(_cx, _cy);

      //var _px = 0, _py = 0;

      World.add( this.engine.world, _body );

      Matter.Body.translate( _body, vector );
    }

  }

  get physicsCanvas(){
    return this.engine.render.canvas;
  }
}

let proto = Physics.prototype;
proto.bodies = [];

proto.width = 1900;
proto.height = 900;

export { Physics }

