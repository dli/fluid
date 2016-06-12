precision highp float;

varying vec2 v_coordinates;

uniform vec3 u_gridResolution;

uniform sampler2D u_pressureTexture;
uniform sampler2D u_velocityTexture;
uniform sampler2D u_markerTexture;

void main () {
    vec3 cellIndex = floor(get3DFragCoord(u_gridResolution + 1.0));

    float left = texture3DNearest(u_pressureTexture, (cellIndex + vec3(-1.0, 0.0, 0.0) + 0.5) / u_gridResolution, u_gridResolution).r;
    float right = texture3DNearest(u_pressureTexture, (cellIndex + 0.5) / u_gridResolution, u_gridResolution).r;

    float bottom = texture3DNearest(u_pressureTexture, (cellIndex + vec3(0.0, -1.0, 0.0) + 0.5) / u_gridResolution, u_gridResolution).r;
    float top = texture3DNearest(u_pressureTexture, (cellIndex + 0.5) / u_gridResolution, u_gridResolution).r;

    float back = texture3DNearest(u_pressureTexture, (cellIndex + vec3(0.0, 0.0, -1.0) + 0.5) / u_gridResolution, u_gridResolution).r;
    float front = texture3DNearest(u_pressureTexture, (cellIndex + 0.5) / u_gridResolution, u_gridResolution).r;


    //compute gradient of pressure
    vec3 gradient = vec3(right - left, top - bottom, front - back) / 1.0;

    vec3 currentVelocity = texture2D(u_velocityTexture, v_coordinates).rgb;

    vec3 newVelocity = currentVelocity - gradient;

    gl_FragColor = vec4(newVelocity, 0.0);
}
