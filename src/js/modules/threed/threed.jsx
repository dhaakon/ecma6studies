const createGeom = require('three-simplicial-complex')(THREE);

import reindex from 'mesh-reindex';
import unindex from 'unindex-mesh';
import shuffle from 'array-shuffle';
import svgMesh3d from 'svg-mesh-3d';
import triangleCentroid from 'triangle-centroid';
import Tweenr from 'tweenr';
import randomVec3 from 'gl-vec3/random'

require('./TrackballControls.jsx');

const vertShader = `
attribute vec3 direction;
attribute vec3 centroid;

uniform float animate;
uniform float opacity;
uniform float scale;

#define PI 3.14

void main() {
  // rotate the triangles
  // each half rotates the opposite direction
  float theta = (1.0 - animate) * (PI * 1.5) * sign(centroid.x);
  mat3 rotMat = mat3(
    vec3(cos(theta), 0.0, sin(theta)),
    vec3(0.0, 1.0, 0.0),
    vec3(-sin(theta), 0.0, cos(theta))
  );

  // push outward
  vec3 offset = mix(vec3(0.0), direction.xyz * rotMat, 1.0 - animate);

  // scale triangles to their centroids
  vec3 tPos = mix(centroid.xyz, position.xyz, scale) + offset;

  gl_Position = projectionMatrix *
              modelViewMatrix *
              vec4(tPos, 1.0);
}`

const fragShader = `
uniform float animate;
uniform float opacity;

void main() {
  gl_FragColor = vec4(vec3(1.0), opacity);
}`;

class ThreeD {
  constructor( canvas ){
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      background:'white',
      devicePixelRatio: window.devicePixelRatio
    });

    this.scene = new THREE.Scene();

    this.width = 1900;
    this.height = 900;

    this.camera = new THREE.PerspectiveCamera( 45, this.width / this.height , 1, 1000 );
    this.camera.position.set( 0, 0, 5 );

    this.controls = new THREE.TrackballControls( this.camera );
    this.controls.target.set( 0, 0, 5 )

    this.render();
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

      return {
        direction: { type: 'v3', value: directions },
        centroid: { type:'v3', value: centroids }
      }

    }
  }

  createMesh ( svg ){
    let options = {
      scale:10,
      simplify: 0.01
    };

    var complex = svgMesh3d( svg, options );

    complex = reindex( unindex( complex.positions, complex.cells ) );

    return complex;
  }

  create( svg ){
    let _complex = this.createMesh( svg );
    const _attributes = this.getAnimationAttributes( _complex.positions, _complex.cells );
    const _geometry = new createGeom( _complex );

    console.log(_attributes);

    const _materialOptions = {
      side: THREE.DoubleSide,
      //vertexShader: vertShader,
      //fragmentShader: fragShader,
      wireframe: true,
      transparent: true,
      uniforms:{
        opacity: { type:'f', value: 1 },
        scale: { type:'f', value:0 },
        animate: { type:'f', value: 0 },
      }
    };

    this.material = new THREE.ShaderMaterial( _materialOptions );

    this.mesh = new THREE.Mesh( _geometry, this.material );
    //console.log(_geometry._bufferGeometry);

    //_geometry.addAttribute("direction", _attributes['direction']);
    //_geometry.addAttribute("centroid", _attributes['centroid']);


    this.scene.add( this.mesh );
  }

  render(){
    this.renderer.render( this.scene, this.camera );

    window.requestAnimationFrame( ()=> this.render() );
  }


}

let proto = ThreeD.prototype;

export { ThreeD }
