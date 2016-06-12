precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_velocityTexture;
uniform sampler2D u_markerTexture;
uniform sampler2D u_weightTexture;

uniform vec3 u_gridResolution;

uniform float u_maxDensity;

void main () {
    vec3 cellIndex = floor(get3DFragCoord(u_gridResolution));

    //divergence = 0 in air cells
    float fluidCell = texture3DNearest(u_markerTexture, (cellIndex + 0.5) / u_gridResolution, u_gridResolution).x;
    if (fluidCell == 0.0) discard;


    float leftX = texture3DNearest(u_velocityTexture, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).x;
    float rightX = texture3DNearest(u_velocityTexture, (cellIndex + vec3(1.0, 0.0, 0.0) + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).x;

    float bottomY = texture3DNearest(u_velocityTexture, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).y;
    float topY = texture3DNearest(u_velocityTexture, (cellIndex + vec3(0.0, 1.0, 0.0) + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).y;

    float backZ = texture3DNearest(u_velocityTexture, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).z;
    float frontZ = texture3DNearest(u_velocityTexture, (cellIndex + vec3(0.0, 0.0, 1.0) + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).z;

    float divergence = ((rightX - leftX) + (topY - bottomY) + (frontZ - backZ)) / 1.0;

    float density = texture3DNearest(u_weightTexture, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).a;
    divergence -= max((density - u_maxDensity) * 1.0, 0.0); //volume conservation

    gl_FragColor = vec4(divergence, 0.0, 0.0, 0.0);
}
