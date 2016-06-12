precision highp float;

attribute vec3 a_cubeVertexPosition;

uniform vec3 u_translation;
uniform vec3 u_scale;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

void main () {
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_cubeVertexPosition * u_scale + u_translation, 1.0);
}
