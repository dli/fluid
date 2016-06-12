//transfers particle velocities to the grid by splatting them using additive blending

precision highp float;

attribute vec2 a_textureCoordinates;

uniform sampler2D u_positionTexture;
uniform sampler2D u_velocityTexture;

uniform vec3 u_gridSize;
uniform vec3 u_gridResolution;

varying vec3 v_position;
varying vec3 v_velocity;

uniform float u_zOffset; //the offset for the z layer we're splatting into
varying float v_zIndex; //the z layer we're splatting into

void main () {
    gl_PointSize = 5.0; //TODO: i can probably compute this more accurately

    vec3 position = texture2D(u_positionTexture, a_textureCoordinates).rgb;
    position = (position / u_gridSize) * u_gridResolution;

    vec3 velocity = texture2D(u_velocityTexture, a_textureCoordinates).rgb;
    v_velocity = velocity;
    v_position = position;

    vec3 cellIndex = vec3(floor(position.xyz));
    v_zIndex = cellIndex.z + u_zOffset; //offset into the right layer

    vec2 textureCoordinates = vec2(
        v_zIndex * (u_gridResolution.x + 1.0) + cellIndex.x + 0.5,
        cellIndex.y + 0.5) / vec2((u_gridResolution.x + 1.0) * (u_gridResolution.z + 1.0), u_gridResolution.y + 1.0);

    gl_Position = vec4(textureCoordinates * 2.0 - 1.0, 0.0, 1.0);
}
