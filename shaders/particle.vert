precision highp float;

attribute vec2 a_textureCoordinates; //the texture coordinates that this particle's info is stored at

uniform sampler2D u_positionTexture;
uniform sampler2D u_velocityTexture;

uniform vec2 u_resolution;

varying vec3 v_velocity;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

void main () {
    vec3 position = texture2D(u_positionTexture, a_textureCoordinates).rgb;
    vec3 velocity = texture2D(u_velocityTexture, a_textureCoordinates).rgb;
    v_velocity = velocity;

    gl_PointSize = 3.0;

    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(position, 1.0);
}
