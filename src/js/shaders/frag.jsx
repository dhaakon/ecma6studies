const fragShader = `
uniform float animate;
uniform float opacity;

uniform vec3 color;

void main() {
  gl_FragColor = vec4( color.rgb, opacity);
  //gl_FragColor = vec4( vec3( 1.0, 0.0, 0.0), opacity);
}
`

export { fragShader }
