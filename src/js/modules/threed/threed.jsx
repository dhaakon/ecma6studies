const createGeom = require('three-simplicial-complex')(THREE);

import reindex from 'mesh-reindex';
import unindex from 'unindex-mesh';
import shuffle from 'array-shuffle';
import svgMesh3d from 'svg-mesh-3d';
import triangleCentroid from 'triangle-centroid';
import Tweenr from 'tweenr';
import randomVec3 from 'gl-vec3/random';

var mat4 = require('gl-mat4');

import{ Tween, Timeline, Easing } from 'dhaak-anim';

var maxWidth = 151;
var maxHeight = 163;


var _ = require('underscore');
var svgBbox = require('svg-path-bounding-box');

//var buffer = require('three-buffer-vertex-data')


import { fragShader } from '../../shaders/frag.jsx';
import { vertShader } from '../../shaders/vert.jsx';

var OrbitControls = require('three-orbit-controls')(THREE);

class Letter {
  constructor( svg, delay ){
    this.delay = delay;
    this.create( svg );
  }

  getAnimationAttributes( positions, cells ){
    const directions = [];
    const centroids = [];

    for( let i = 0; i < cells.length; ++i ){
      const [ f0, f1, f2 ] = cells[i];
      const triangle = [ positions[ f0 ], positions[ f1 ], positions[ f2 ]];
      const center = triangleCentroid( triangle );
      const dir = new THREE.Vector3().fromArray( center );

      centroids.push( dir, dir, dir );

      const random = randomVec3( [], Math.random() );
      const anim = new THREE.Vector3().fromArray( random );

      directions.push( anim, anim, anim );
    }
    return {
      direction: { type: 'v3', value: directions },
      centroid: { type:'v3', value: centroids }
    }
  }

  createMesh ( svg ){
    var _bb = svgBbox(svg);

    
    let options = {
      scale:40,
      simplify: 0.01,
      randomization: 2000
    };

    var complex = svgMesh3d( svg, options );

    complex = reindex( unindex( complex.positions, complex.cells ) );

    return complex;
  }

  create( svg ){
    console.log(svg);
    const _d = new Date().getMilliseconds();
    console.log( _d );

    let _complex = svg.complex.complex;

    this.x = svg.complex.x;
    this.y = svg.complex.y;

    this.width = svg.complex.width;
    this.height = svg.complex.height;
    //this.x = svg.x;
    //this.y = svg.y;

    this.bWidth = svg.bWidth;
    this.bHeight = svg.bHeight;

    console.log('elapsed time');
    console.log( (_d - new Date().getMilliseconds()) / 1000, ' seconds');
    console.log('------------');

    this.fill = svg.fill;
    const _attributes = this.getAnimationAttributes( _complex.positions, _complex.cells );

    this.geometry = new createGeom( _complex );

    // set up our geometry
    //this.geometry = new THREE.BufferGeometry()

    //buffer.index( this.geometry, _complex.cells );

    //buffer.attr( this.geometry, 'position', _complex.positions)
    //buffer.attr( this.geometry,'direction', new THREE.BufferAttribute( (_attributes.direction), 3 ));
    //buffer.attr( this.geometry, 'centroid', new THREE.BufferAttribute( (_attributes.centroid), 3 ));


    var _color = new THREE.Color( this.fill );
    var v3 = new THREE.Vector3( _color.r, _color.g, _color.b );

    var switch_ = Math.round( Math.random() );

    const _materialOptions = {
      color:0xff000000,
      side: THREE.DoubleSide,
      vertexShader: vertShader,
      fragmentShader: fragShader,
      //wireframe: false,
      wireframe: (switch_ === 0) ? true: false,
      transparent: false,
      attributes: _attributes,
      uniforms:{
        color:{ type:'c', value: _color },
        opacity: { type:'f', value: 1 },
        scale: { type:'f', value:0 },
        animate: { type:'f', value: 0 }
      }
    };

    this.material = new THREE.ShaderMaterial( _materialOptions );
    this.mesh = new THREE.Mesh( this.geometry, this.material );

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
  }

  explode (){
    let _t = new Tweenr();
    const _delay = this.delay;
    const _duration = 0.95;

    const _ease = 'quadOut';

    var options = {
      value: 1,
      duration: _duration,
      delay: _delay,
      ease: _ease
    };

    let node = [ this.material.uniforms.animate, this.material.uniforms.scale ]

    var _reverse = {
      value: 0,
      duration: _duration,
      ease:_ease
    };

    let _reverseFn = ()=> {
      var _o = _.clone( options );
      _o.value = 0;
      _o.delay = 6;

      _t.to( node[0], _o );
      _o.value = 0.2;
      _t.to( node[1], _o ).on( 'complete' , ()=>{
        options.delay = _delay + 4;
        _t.to( node[0], options ).on('complete', _reverseFn);
        _t.to( node[1], options );
      });
    };

    _t.to( node[0], options ).on('complete', _reverseFn);
    _t.to( node[1], options );

  }

  get scale(){
    console.log(this.bWidth, this.bHeight, this.height, this.width);

    return {
      sy: Math.min( 1, this.height / this.bHeight),
      sx: Math.min( 1, this.width / this.bWidth)
    }
  }

}

class ThreeD {
  constructor( canvas ){
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      background:'white',
      devicePixelRatio: window.devicePixelRatio
    });

    this.renderer.setClearColor(0xffffff);
    this.renderer.shadowMapEnabled = true;
    this.renderer.shadowMapType = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();

    var geom = new THREE.PlaneGeometry( 40, 40 );
    var mat = new THREE.MeshBasicMaterial({ color: 0xffffff, wirefame:false });
    this.ground = new THREE.Mesh( geom, mat );
    this.scene.add(this.ground);


    this.ground.position.set( -5, -5, 0 );

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera( 75, this.width / this.height , 0.1, 100 );
    this.camera.position.set( 0, 0, 8.5 );

    this.camera.lookAt( new THREE.Vector3() );

    this.render();
  }

  convertPoint( point2d ){
    //var projector = new THREE.Projector();
    this.camera.updateMatrixWorld();

    var point = new THREE.Vector3().project( this.camera);
    var elem = this.renderer.domElement;

    //point.x = point2d.x - 1 * ( 2 / this.width)
    //point.x = point2d.y + 1 * -( 2 / this.height)
    point.x = ( point2d.x  + 1 )/  (2 * this.width);
    point.y = -( point2d.y  - 1 )/ (2 * this.height);
    point.z = 0.5;

    //console.log(point2d.x / this.width);

    return point.unproject( this.camera );
    //return point;
  }

  create( svg ){
    let letter = new Letter( svg, Math.random() * 5 );

    this.letters.push( letter );

    this.scene.add( letter.mesh );

    let _v = new THREE.Vector3( 0, 0, 0);

    let _factor = 100;

    let _x = (letter.x / 612) * 10;
    let _y = (letter.y) / _factor;

    console.log(letter);
    var _vv = this.convertPoint( letter );


    var vector = new THREE.Vector3( 
        ( letter.x / ( 0.5 * 7.5 ) ), 
        ( letter.y / ( 0.5 * 7.5 ) ), 
        0.5
    );


    console.log(_vv);
    letter.mesh.position.set( _x - 3.5, _y + 0.2, 2 );
    //letter.mesh.rotation.x = 360 * Math.random();
    letter.explode();

    //console.log( letter.width, letter.height );
    //console.log( letter.scale.sx, letter.scale.sy );
  }

  render(){
    //this.camera.position.set( this.camera.position.x, this.camera.position.y, this.camera.position.z - this.count );
    this.renderer.render( this.scene, this.camera );
    for (var _letter in this.letters ){
      //this.letters[_letter].mesh.rotation.y += 0.001//Math.random() / 100
      //this.letters[_letter].mesh.rotation.x += 0.001//Math.random() / 100
    }

    window.requestAnimationFrame( ()=> this.render() );
  }


}

let proto = ThreeD.prototype;
proto.tweenr = new Tweenr({ defaultEase: 'quadIn' });
proto.meshCount = 0;
proto.letters = [];
proto.count = 0.001;
function createNoisyEasing(randomProportion, easingFunction) {
    var normalProportion = 1.0 - randomProportion;
    return function(k) {
      return randomProportion * Math.random() + normalProportion * easingFunction(k);
    }
  }
export { ThreeD }

