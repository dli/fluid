//marks pixels with 1.0 if there's a particle there

precision highp float;

attribute vec2 a_textureCoordinates;

uniform sampler2D u_positionTexture;

uniform vec3 u_gridResolution;
uniform vec3 u_gridSize;

void main () {
    gl_PointSize = 1.0;

    vec3 position = texture2D(u_positionTexture, a_textureCoordinates).rgb;
    position = (position / u_gridSize) * u_gridResolution;
    vec3 cellIndex = floor(position);

    vec2 textureCoordinates = vec2(
        cellIndex.z * u_gridResolution.x + cellIndex.x + 0.5,
        cellIndex.y + 0.5) / vec2(u_gridResolution.x * u_gridResolution.z, u_gridResolution.y);

    gl_Position = vec4(textureCoordinates * 2.0 - 1.0, 0.0, 1.0);
}
