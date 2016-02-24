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
import { DigitalGlitch } from './fx/glitch.jsx';
import { VignetteShader } from './fx/vignette.jsx';

var OrbitControls = require('three-orbit-controls')(THREE);
//import { EventEmitter } from 'wolfy87-eventemitter';
var EventEmitter = require('wolfy87-eventemitter');

var EffectComposer = require('three-effectcomposer')(THREE);


THREE.DotScreenShader = {
  uniforms: {
    "tDiffuse": { type: "t", value: null },
    "tSize":    { type: "v2", value: new THREE.Vector2( 256, 256 ) },
    "center":   { type: "v2", value: new THREE.Vector2( 0.5, 0.5 ) },
    "angle":    { type: "f", value: 1.57 },
    "scale":    { type: "f", value: 1.0 }
  },
  vertexShader: [
    "varying vec2 vUv;",
    "void main() {",
      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
    "}"
  ].join("\n"),
  fragmentShader: [
    "uniform vec2 center;",
    "uniform float angle;",
    "uniform float scale;",
    "uniform vec2 tSize;",
    "uniform sampler2D tDiffuse;",
    "varying vec2 vUv;",
    "float pattern() {",
      "float s = sin( angle ), c = cos( angle );",
      "vec2 tex = vUv * tSize - center;",
      "vec2 point = vec2( c * tex.x - s * tex.y, s * tex.x + c * tex.y ) * scale;",
      "return ( sin( point.x ) * sin( point.y ) ) * 4.0;",
    "}",
    "void main() {",
      "vec4 color = texture2D( tDiffuse, vUv );",
      "float average = ( color.r + color.g + color.b ) / 3.0;",
      "gl_FragColor = vec4( vec3( average * 10.0 - 5.0 + pattern() ), color.a );",
    "}"
  ].join("\n")
};

THREE.RGBShiftShader = {
  uniforms: {
    "tDiffuse": { type: "t", value: null },
    "amount":   { type: "f", value: 0.005 },
    "angle":    { type: "f", value: 0.0 }
  },
  vertexShader: [
    "varying vec2 vUv;",
    "void main() {",
      "vUv = uv;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
    "}"
  ].join("\n"),
  fragmentShader: [
    "uniform sampler2D tDiffuse;",
    "uniform float amount;",
    "uniform float angle;",
    "varying vec2 vUv;",
    "void main() {",
      "vec2 offset = amount * vec2( cos(angle), sin(angle));",
      "vec4 cr = texture2D(tDiffuse, vUv + offset);",
      "vec4 cga = texture2D(tDiffuse, vUv);",
      "vec4 cb = texture2D(tDiffuse, vUv - offset);",
      "gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);",
    "}"
  ].join("\n")
};



class Letter extends EventEmitter {
  constructor( svg, delay ){
    super();
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
    const _d = new Date().getMilliseconds();

    let _complex = svg.complex.complex;

    this.x = svg.complex.x;
    this.y = svg.complex.y;

    this.width = svg.complex.width;
    this.height = svg.complex.height;
    //this.x = svg.x;
    //this.y = svg.y;

    this.bWidth = svg.bWidth;
    this.bHeight = svg.bHeight;

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
    const _duration = 1.55;

    const _ease = 'cosOut';

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
      _o.duration = 1.35;
      _o.ease = 'quadOut';
      _o.delay = 6 + ( this.delay + 2);

      _t.to( node[0], _o ).on( 'start', ()=> { this.emitEvent('shake') } );
      _o.value = 0;
      _t.to( node[1], _o ).on( 'complete' , ()=>{
        options.delay = _delay + 4;
        _t.to( node[0], options ).on('complete', _reverseFn);
        _t.to( node[1], options );
        _t.to( this.mesh.scale , { value: 5, duration: 0.5 });
      });
    };

    _t.to( node[0], options ).on('complete', _reverseFn);
    _t.to( node[1], options );
    _t.to( this.mesh.scale , { value: 1, duration: 0.5 });

  }

  get scale(){
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
    //this.scene.add(this.ground);


    this.ground.position.set( -5, -5, 0 );



    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera( 90, this.width / this.height , 0.1, 10000 );
    this.camera.position.set( 0, 0, 3 );

    this.composer = new EffectComposer( this.renderer );
    this.composer.addPass( new EffectComposer.RenderPass( this.scene, this.camera ) );

    //var effect = new EffectComposer.ShaderPass( THREE.DotScreenShader );
    //effect.uniforms[ 'scale' ].value = 10;
    //this.composer.addPass( effect );

    this.vignetteEffect = new EffectComposer.ShaderPass( VignetteShader );
    this.vignetteEffect.uniforms[ 'offset' ].value = 0.4;
    this.vignetteEffect.uniforms[ 'darkness' ].value = 0.9;
    this.vignetteEffect.renderToScreen = true;

    this.RGBeffect = new EffectComposer.ShaderPass( THREE.RGBShiftShader );
    this.RGBeffect.uniforms[ 'amount' ].value = 0;
    this.RGBeffect.renderToScreen = true;

    this.composer.addPass( this.RGBeffect );
    //this.composer.addPass( this.vignetteEffect );
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


    return point.unproject ( this.camera );
    //return point;
  }

  create( svg ){
    let letter = new Letter( svg, Math.random() * 5 );
    letter.addListener('shake', ()=>{ this.shake(); });

    this.letters.push( letter );

    this.scene.add( letter.mesh );

    let _v = new THREE.Vector3( 0, 0, 0);

    let _factor = 100;

    let _x = (letter.x / 612) * 10;
    let _y = (letter.y) / _factor;

    var _vv = this.convertPoint( letter );


    var vector = new THREE.Vector3( 
        ( letter.x / ( 0.5 * 7.5 ) ), 
        ( letter.y / ( 0.5 * 7.5 ) ), 
        0.5
    );


    letter.mesh.position.set( _x - 3.15, _y, 0 );
    //letter.mesh.rotation.x = 360 * Math.random();
    letter.explode();

  }
  
  shake(){
    if(this.isShaking) return;
    var count = this.shakeCount;

    var iPos = this.camera.position;

    var _interval = ()=>{
      var _rumble = Math.random() / ( 20000 / count ) ;
      let _x = this.camera.position.x + _rumble;
      let _y = this.camera.position.y + _rumble;
      let _z = this.camera.position.z + (_rumble * 1.5);

      _x = ( Math.round( Math.random()) === 0 ) ? _x * -1 : _x;
      _y = ( Math.round( Math.random()) === 0 ) ? _y * -1 : _y;
      _z = ( Math.round( Math.random()) === 0 ) ? _z : _z;

      if ( count > 0){
        this.camera.position.set( _x, _y, _z );
        this.RGBeffect.uniforms[ 'amount' ].value = _rumble * 5;
        this.RGBeffect.uniforms[ 'angle' ].value = Math.random() * 360;
        
        this.isShaking = true;
        count--;
      }else{
        this.isShaking = false;
        count = this.shakeCount;
        clearInterval( shake );

        if (this.shakeCount < this.maxShakeCount){
          this.shakeCount++;
        }else{
          this.shakeCount = 50;
        }
        
        this.RGBeffect.uniforms[ 'amount' ].value = 0;
        this.camera.position.set( 0, 0,  3);
        return
      }
    };

    var shake = setInterval( _interval, 1);
  }

  render(){
    //this.camera.position.set( this.camera.position.x, this.camera.position.y, this.camera.position.z - this.count );
    
    this.composer.render( );

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
proto.count = 0.0005;
proto.isShaking = false;
proto.shakeCount = 50;
proto.maxShakeCount = 85;

function createNoisyEasing(randomProportion, easingFunction) {
    var normalProportion = 1.0 - randomProportion;
    return function(k) {
      return randomProportion * Math.random() + normalProportion * easingFunction(k);
    }
  }
export { ThreeD }

