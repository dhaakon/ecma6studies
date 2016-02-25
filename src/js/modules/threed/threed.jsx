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
var EventEmitter = require('wolfy87-eventemitter');
var EffectComposer = require('three-effectcomposer')(THREE);

THREE.RGBShiftShader = require('./fx/RGBShiftShader.jsx');

class Letter extends EventEmitter {
  constructor( svg, delay ){
    super();
    this.tween = new Tweenr();
    this.isExploding = false;
    this.isAnimateingIn = true;
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

  explode( perc ){
     if( this.isExploding ) return;
     this.isExploding = true;
   
     const _delay = this.delay;
     const _duration = 1.00;
     const _ease = 'cosOut';

     let _t = this.tween;
     let node = [ this.material.uniforms.animate, this.material.uniforms.scale ]

    var options = {
      value: 1,
      duration: _duration,
      delay: _delay,
      ease: _ease
    };

    var _o = {
      value : 0,
      duration:1.35,
      ease:'quadOut',
      delay: 0
    };

    _t.to( node[0], _o ).on( 'start', ()=> { this.emitEvent('shake', [perc]) } );

    // reset value for animation
    _o.value = 0;

    _t.to( node[1], _o ).on( 'complete' , ()=>{
      options.delay = 0;
      _t.to( node[0], options ).on( 'complete', ()=> { this.isExploding = false; } );
      _t.to( node[1], options );
      
    });
  }

  animateIn(){
    let _t = this.tween;
    const _delay = Math.random();
    const _duration = 0.65;
    const _ease = 'cosOut';
    

    var options = {
      value: 1,
      duration: _duration,
      delay: _delay,
      ease: _ease
    };  
    let node = [ this.material.uniforms.animate, this.material.uniforms.scale ]


    _t.to( node[0], options ).on('complete', ()=>{ this.isAnimateingIn = false; });
    _t.to( node[1], options );
    
    _t.to( this.mesh.scale , { value: 1, duration: 0.5 });
  }

  
/*
  explode (){
    let _t = this.tween;
    const _delay = this.delay;
    const _duration = 1.00;
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
      
      var _o = {
        value : 0,
        duration:1.35,
        ease:'quadOut',
        delay: 6 + ( this.delay + 2)
      };

      _t.to( node[0], _o ).on( 'start', ()=> { this.emitEvent('shake') } );

      // reset value for animation
      _o.value = 0;

      _t.to( node[1], _o ).on( 'complete' , ()=>{
        options.delay = _delay + 4;
        _t.to( node[0], options ).on('complete', _reverseFn);
        _t.to( node[1], options );
        _t.to( this.mesh.scale , { value: 5, duration: 0.5 });
      });
    };

    // animate in
    _t.to( node[0], options ).on('complete', _reverseFn);
    _t.to( node[1], options );
    
    _t.to( this.mesh.scale , { value: 1, duration: 0.5 });
  }
 */

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
      antialiasing: true,
      devicePixelRatio: window.devicePixelRatio
    });

    this.renderer.setClearColor(0xffffff);
    this.renderer.shadowMapEnabled = true;
    this.renderer.shadowMapType = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();

    var geom = new THREE.PlaneGeometry( 40, 40 );
    var mat = new THREE.MeshBasicMaterial({ color: 0xffffff, wirefame:false });

    //this.ground = new THREE.Mesh( geom, mat );
    //this.scene.add(this.ground);
    //this.ground.position.set( -5, -5, 0 );

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
    this.camera.lookAt( new THREE.Vector3() );

    this.render();
  }

  convertPoint( point2d ){
    this.camera.updateMatrixWorld();

    var point = new THREE.Vector3().project( this.camera);
    var elem = this.renderer.domElement;

    point.x = ( point2d.x  + 1 )/  (2 * this.width);
    point.y = -( point2d.y  - 1 )/ (2 * this.height);
    point.z = 0.5;

    return point.unproject ( this.camera );
  }

  create( svg ){
    let letter = new Letter( svg, Math.random() * 5 );
    letter.addListener('shake', (perc)=>{ this.shake(perc); });

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
    //letter.explode();
    letter.animateIn();
  }
  
  explode( perc ){
    var ran = Math.floor( Math.random() * this.letters.length );
    this.letters[ran].explode( perc );
  }

  shatter( perc ){
    for( var _letter in this.letters ){
      let _l = this.letters[_letter];
      let _neg = (Math.round( Math.random() ) === 1) ? -1 : 1;
      if ( _neg !== -1 || !_l.isExploding || !_l.isAnimateingIn ){
        var jitter = Math.random() / 1000;
        var impact = perc/20;
        _l.material.uniforms.animate.value = 1 - jitter - impact;
      }
    }
  }

  reset( perc ){
    for( var _letter in this.letters ){
      //let _neg = (Math.round( Math.random() ) === 1) ? -1 : 1;
      let _l = this.letters[_letter];
      
      if ( !_l.isExploding || !_l.isAnimateingIn ) {
        _l.material.uniforms.animate.value = 1;
        _l.material.uniforms.scale.value = 1;
      }
    }
  }


  shake( perc ){
    if(this.isShaking) return;

    
    var count = this.shakeCount;
    var iPos = this.camera.position;

    var _interval = ()=>{
      var _rumble = perc/25;

      _rumble = (isNaN(_rumble)) ? 0.12 : _rumble;

      let _x = this.camera.position.x + _rumble;
      let _y = this.camera.position.y + _rumble;
      let _z = this.camera.position.z + ( ( Math.round( Math.random()) === 0 ) ? _rumble : -(_rumble));

      _x = ( Math.round( Math.random()) === 0 ) ? _x * -1 : _x;
      _y = ( Math.round( Math.random()) === 0 ) ? _y * -1 : _y;
      _z = ( isNaN(_z) ) ? 3 : _z;

      if ( count > 0){
        this.camera.position.set( _x, _y, ( !isNaN(_z) ) ? _z : 3 );
        this.RGBeffect.uniforms[ 'amount' ].value = perc/15;
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

