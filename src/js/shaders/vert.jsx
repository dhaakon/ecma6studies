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
  float theta = (1.0 - animate) * (PI * 0.5 ) * sign(centroid.x);
  float _fact = 25.0;

  mat3 rotMat = mat3(
    vec3(-cos(theta) * _fact, sin(theta) * _fact, sin(theta) * _fact),
    vec3(cos(theta) * _fact, -cos(theta) * _fact, cos(theta) * _fact),
    vec3(-sin(theta) * _fact, cos(theta) * _fact, _fact * cos(theta))
  );

  // push outward
  vec3 offset = mix(vec3(0.0), direction.xyz * rotMat, 1.0 - animate);

  // scale triangles to their centroids
  vec3 tPos = mix(centroid.xyz, position.xyz, scale) + offset;
  //vec3 tPos = vec3(0.0);

  gl_Position = projectionMatrix *
              modelViewMatrix *
              vec4(tPos, 1.0);
}
`

export { vertShader }
