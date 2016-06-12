precision highp float;

attribute vec3 a_position;

uniform vec3 u_position;

uniform mat3 u_rotation;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

void main () {
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(u_position + u_rotation * a_position * 0.2, 1.0);
}
