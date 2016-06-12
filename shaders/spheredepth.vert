precision highp float;

attribute vec3 a_vertexPosition;
attribute vec3 a_vertexNormal;

attribute vec2 a_textureCoordinates;

uniform mat4 u_projectionViewMatrix;

uniform sampler2D u_positionsTexture;
uniform sampler2D u_velocitiesTexture;

uniform float u_sphereRadius;

void main () {
    vec3 spherePosition = texture2D(u_positionsTexture, a_textureCoordinates).rgb;

    vec3 position = a_vertexPosition * u_sphereRadius + spherePosition;

    gl_Position = u_projectionViewMatrix * vec4(position, 1.0);
}
