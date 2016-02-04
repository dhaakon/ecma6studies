/*
 * // Matter.js module aliases
var Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;

// create a Matter.js engine
var engine = Engine.create(document.body);

// create two boxes and a ground
var boxA = Bodies.rectangle(400, 200, 80, 80);
var boxB = Bodies.rectangle(450, 50, 80, 80);
var ground = Bodies.rectangle(400, 610, 810, 60, { isStatic: true });

// add all of the bodies to the world
World.add(engine.world, [boxA, boxB, ground]);

// run the engine
Engine.run(engine);
*/

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
          background: '#ffffff',
          wireframeBackground: '#ffffff'
        }
      }
    }

    this.engine = Engine.create( renderOptions );

    // create two boxes and a ground
    var boxA = Bodies.rectangle(400, 200, 80, 80);
    var boxB = Bodies.rectangle(450, 50, 80, 80);
    var ground = Bodies.rectangle(400, 610, 810, 60, { isStatic: true });

    World.add( this.engine.world, [boxA, boxB, ground] );
    // add all of the bodies to the world

    this.canvas = canvas;

    console.log(this.engine);

    // run the engine
    Engine.run( this.engine );
  }

  createWorld(){
    
  }

  createBodies(){
    
  }

  get physicsCanvas(){
    return this.engine.render.canvas;
  }
}

let proto = Physics.prototype;

export { Physics }
