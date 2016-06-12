precision highp float;

varying vec2 v_coordinates;

uniform vec3 u_gridResolution;

uniform sampler2D u_pressureTexture;
uniform sampler2D u_divergenceTexture;
uniform sampler2D u_markerTexture;

void main () {
    vec3 centerCoords = get3DFragCoord(u_gridResolution) / u_gridResolution;

    //pressure = 0 in air cells
    float fluidCell = texture3DNearest(u_markerTexture, centerCoords, u_gridResolution).x;
    if (fluidCell == 0.0) discard; //if this is an air cell

    vec3 delta = 1.0 / u_gridResolution;

    float divergenceCenter = texture3DNearest(u_divergenceTexture, centerCoords, u_gridResolution).r;

    float left = texture3DNearest(u_pressureTexture, centerCoords + vec3(-delta.x, 0.0, 0.0), u_gridResolution).r;
    float right = texture3DNearest(u_pressureTexture, centerCoords + vec3(delta.x, 0.0, 0.0), u_gridResolution).r;
    float bottom = texture3DNearest(u_pressureTexture, centerCoords + vec3(0.0, -delta.y, 0.0), u_gridResolution).r;
    float top = texture3DNearest(u_pressureTexture, centerCoords + vec3(0.0, delta.y, 0.0), u_gridResolution).r;
    float back = texture3DNearest(u_pressureTexture, centerCoords + vec3(0.0, 0.0, -delta.z), u_gridResolution).r;
    float front = texture3DNearest(u_pressureTexture, centerCoords + vec3(0.0, 0.0, delta.z), u_gridResolution).r;

    float newPressure = (left + right + bottom + top + back + front - divergenceCenter) / 6.0;


    gl_FragColor = vec4(newPressure, 0.0, 0.0, 0.0);

}
