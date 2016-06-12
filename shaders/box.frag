precision highp float;

varying vec3 v_cubePosition;

uniform vec3 u_highlightSide;
uniform vec3 u_highlightColor;

void main () {
    float epsilon = 0.001;
    vec3 normalizedCubePosition = v_cubePosition * 2.0 - 1.0;

    if (abs(normalizedCubePosition.x - u_highlightSide.x) < epsilon || abs(normalizedCubePosition.y - u_highlightSide.y) < epsilon || abs(normalizedCubePosition.z - u_highlightSide.z) < epsilon ) {
        gl_FragColor = vec4(u_highlightColor, 1.0);
    } else {
        gl_FragColor = vec4(vec3(0.97), 1.0);
    }
}
