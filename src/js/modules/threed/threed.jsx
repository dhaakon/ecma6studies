const createGeom = require('three-simplicial-complex')(THREE);

import reindex from 'mesh-reindex';
import unindex from 'unindex-mesh';
import shuffle from 'array-shuffle';
import svgMesh3d from 'svg-mesh-3d';
import triangleCentroid from 'triangle-centroid';
import Tweenr from 'tweenr';
import randomVec3 from 'gl-vec3/random';

import{ Tween, Timeline, Easing } from 'dhaak-anim';

var maxWidth = 448;
var maxHeight = 424;


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

    this.x = _bb.x1;
    this.y = _bb.y1;

    this.height = _bb.height;
    this.width = _bb.width;

    let options = {
      scale:2,
      simplify: 0.001,
      randomization: 1500
    };

    var complex = svgMesh3d( svg, options );

    complex = reindex( unindex( complex.positions, complex.cells ) );

    return complex;
  }

  create( svg ){
    let _complex = this.createMesh( svg.d );
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
    console.log( v3 );

    const _materialOptions = {
      color:0xff000000,
      side: THREE.DoubleSide,
      vertexShader: vertShader,
      fragmentShader: fragShader,
      wireframe: false,
      //wireframe: true,
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

    //this.scene.add( mesh );

    //this.animate();
    //this.explode();
  }

  explode (){
    let _t = new Tweenr();
    const _delay = this.delay;

    var options = {
      value: 1,
      duration: 0.5,
      delay: _delay
    };

    let node = [this.material.uniforms.animate, this.material.uniforms.scale]

    var _reverse = {
      value: 0,
      duration: 0.5,
      ease:'expoIn'
    };

    let _reverseFn = ()=> {
      var _o = _.clone( options );
      _o.value = 0;
      _o.delay = 6;

      _t.to( node[0], _o );
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
    return {
      sy: Math.min( 1, this.height / maxHeight),
      sx: Math.min( 1, this.width / maxWidth)
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

    this.scene = new THREE.Scene();

    this.width = 1900;
    this.height = 900;

    this.camera = new THREE.PerspectiveCamera( 45, this.width / this.height , 1, 1000 );
    this.camera.position.set( 0, 0, 7.5 );

    //this.camera.lookAt( new THREE.Vector3() );
    
    //OrbitControls.prototype.target = new THREE.Vector3();

    //var controls = OrbitControls( this.camera );

    this.render();
  }

  create( svg ){
    let letter = new Letter( svg, 3 - this.letters.length );

    this.letters.push( letter );

    this.scene.add( letter.mesh );

    let _v = new THREE.Vector3( 0, 0, 0);

    let _factor = 80;

    let _x = letter.x / _factor;
    let _y = letter.y / _factor;

    var elem = this.renderer.domElement, 
        boundingRect = elem.getBoundingClientRect(),
        x = (letter.x - boundingRect.left) * (elem.width / boundingRect.width),
        y = (letter.y - boundingRect.top) * (elem.height / boundingRect.height);

    var vector = new THREE.Vector3( 
        ( letter.x / this.width ) * 2 - 1, 
        -( letter.y / this.height )  * 2 + 1, 
        0.5
    );

    //console.log(vector);

    //var raycaster = new THREE.Raycaster(); // create once
    //var mouse = new THREE.Vector2(); // create once

    //mouse.x = ( event.clientX / renderer.domElement.width ) * 2 - 1;
    //mouse.y = - ( event.clientY / renderer.domElement.height ) * 2 + 1;

    //raycaster.setFromCamera( mouse, camera );

    //var intersects = raycaster.intersectObjects( objects, recursiveFlag );

    letter.mesh.position.set( _x - 3.5, _y, vector.z ); 
    //letter.mesh.scale.set( letter.scale.sx, letter.scale.sy, 1);
    letter.explode();

    console.log(_x, _y);


    //console.log( letter.width, letter.height );
    //console.log( letter.scale.sx, letter.scale.sy );
  }

  render(){
    //this.camera.position.set( this.camera.position.x, this.camera.position.y, this.camera.position.z - this.count );
    this.renderer.render( this.scene, this.camera );

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

/*
 *

function Point3D get3dPoint(Point2D point2D, int width,
        int height, Matrix viewMatrix, Matrix projectionMatrix) {
 
        double x = 2.0 * winX / clientWidth - 1;
        double y = - 2.0 * winY / clientHeight + 1;
        Matrix4 viewProjectionInverse = inverse(projectionMatrix *
             viewMatrix);

        Point3D point3D = new Point3D(x, y, 0); 
        return viewProjectionInverse.multiply(point3D);
}

*/
