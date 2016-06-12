//this does the divide in the weighted sum

precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_accumulatedVelocityTexture;
uniform sampler2D u_weightTexture;

void main () {
    vec3 accumulatedVelocity = texture2D(u_accumulatedVelocityTexture, v_coordinates).rgb;
    vec3 weight = texture2D(u_weightTexture, v_coordinates).rgb;

    float xVelocity = 0.0;
    if (weight.x > 0.0) {
        xVelocity = accumulatedVelocity.x / weight.x;
    }

    float yVelocity = 0.0;
    if (weight.y > 0.0) {
        yVelocity = accumulatedVelocity.y / weight.y;
    }

    float zVelocity = 0.0;
    if (weight.z > 0.0) {
        zVelocity = accumulatedVelocity.z / weight.z;
    }

    gl_FragColor = vec4(xVelocity, yVelocity, zVelocity, 0.0);
}
