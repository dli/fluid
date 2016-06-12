precision highp float;

varying vec2 v_position;

void main () {
    vec3 backgroundColor = vec3(1.0) - length(v_position) * 0.1;
    gl_FragColor = vec4(backgroundColor, 1.0);
}
