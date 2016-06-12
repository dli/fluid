precision highp float;

attribute vec3 a_vertexPosition;

uniform vec3 u_translation;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

void main () {
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(u_translation + a_vertexPosition, 1.0);
}
