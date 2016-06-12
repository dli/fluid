precision highp float;

varying vec3 v_velocity;

void main () {
    gl_FragColor = vec4(v_velocity * 0.5 + 0.5, 1.0);

    gl_FragColor = vec4(mix(vec3(0.0, 0.2, 0.9), vec3(1.0, 0.3, 0.2), length(v_velocity) * 0.1), 1.0);
}
