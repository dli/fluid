precision highp float;

uniform sampler2D u_texture;

varying vec2 v_coordinates;

void main () {
    gl_FragColor = texture2D(u_texture, v_coordinates);
}
