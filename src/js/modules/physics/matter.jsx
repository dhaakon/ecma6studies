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
          wireframes:false,
          positionIterations: 6,
          velocityIterations: 4,
          enableSleeping: false,
          metrics: { extended: true }
        }
      }
    };

    this.engine = Engine.create( renderOptions );

    this.canvas = canvas;
    this.setupEvents();
    this.createWorld();

    document.body.addEventListener( 'mousedown', ()=>{
      console.log('mouse down');

      for( var letter in this.letterShapes ){
        var _shape = this.letterShapes[letter];

        Matter.Sleeping.set( _shape, false);
      };

    });

    // run the engine
    Engine.run( this.engine );
  }

  setupEvents(){
    Matter.Events.on( this.engine, "afterUpdate", this.afterUpdate.bind(this) );
    Matter.Events.on( this.engine, "beforeUpdate", this.beforeUpdate.bind(this) );
  }

  beforeUpdate( event ){
  }

  afterUpdate( event ){
    return
    let _time = ~~(event.timestamp/10);

    if (_time % this.rate == 1){
      this.createBodies();
    }
  }

  createWorld(){
    var ground = Bodies.rectangle(-25, this.height/2, 50, this.height, { isStatic: true });
    var groundA = Bodies.rectangle(this.width+25, this.height/2, 50, this.height, { isStatic: true });
    var groundB = Bodies.rectangle(this.width/2, this.height + 25, this.width, 50, { isStatic: true });
    World.add( this.engine.world, ground );
    World.add( this.engine.world, groundA );
    World.add( this.engine.world, groundB );
  }

  createBodies(){
    let fn = ()=> {
      var min = 5;
      var max = 50;
      var _size = Math.max( min, Math.random() * max );

      var options = {
        mass: 100,
        restitution: Math.random(),
        render:{
          fillStyle: 'black',
          strokeStyle: 'black'
        }
      };

      if ( this.count > this.maxCount){
        var _body = this.circs.splice(0, 1);
        World.remove( this.engine.world, _body);
      }

      this.count++;

      var body = Bodies.circle( Math.random() * this.width, Math.min( -50, Math.random() * -500 ), _size, options);
      this.circs.push( body );

      World.add( this.engine.world, body );
    }

    fn();
  }

  addVertex( polygons ){
    let _composite = Matter.Composite.create();

    var options = {
      isSleeping: true,
      render:{
        lineWidth: 0
      }
    };

    for( var polygon in polygons){
      var poly = polygons[polygon];

      poly.sort( function( a, b ) {
        var x1 = b.x - a.x;

        return x1 == 0 ? a.y - b.y : a.x - b.x;
      });

      var body = Matter.Body.create( options );
      var _vert = Matter.Vertices.create( poly, body );

      var _body = Bodies.fromVertices( 0, 0, _vert, options );
      _body.render.fillStyle = Matter.Common.choose( [ '#666', '#777', '#222', '#333', '#444', '#555' ] );

      var num = 0;
      var _p = poly[ num ];

      var _c = Matter.Vertices.centre( _vert );
      var _cx = _c.x, _cy = _c.y;

      var _px = _p.x;
      var _py = _p.y;

      var vector = Matter.Vector.create(_cx, _cy);

      Matter.Composite.add( _composite, _body );
      this.letterShapes.push( _body );

      Matter.Body.translate( _body, vector );
    }
    World.add( this.engine.world, _composite );
    this.composites.push( _composite );
  }

  get physicsCanvas(){
    return this.engine.render.canvas;
  }
}

let proto = Physics.prototype;
proto.bodies = [];

proto.width = 1900;
proto.height = 900;

proto.rate = 10;
proto.circs = [];
proto.count = 0;
proto.maxCount = 200;

proto.letterShapes = [];
proto.composites = [];

export { Physics }

