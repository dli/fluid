precision highp float;

varying vec2 v_coordinates;

uniform vec2 u_gridResolution;

uniform sampler2D u_velocityTexture;
uniform sampler2D u_weightTexture;

void main () {
    vec2 velocity = texture2D(u_velocityTexture, v_coordinates).rg;

    vec2 delta = 1.0 / (u_gridResolution + 1.0);

    bool airX = texture2D(u_weightTexture, v_coordinates).x == 0.0;
    bool airY = texture2D(u_weightTexture, v_coordinates).y == 0.0;

    float closestXDistance = 100000.0;
    float closestYDistance = 100000.0;

    if (airX || airY) {
        const int SEARCH_WIDTH = 1;
        for (int y = -SEARCH_WIDTH; y <= SEARCH_WIDTH; ++y) {
            for (int x = -SEARCH_WIDTH; x <= SEARCH_WIDTH; ++x) {
                if (x != 0 && y != 0) {
                    vec2 coordinates = v_coordinates + vec2(float(x), float(y)) * delta;
                    float dist = float(x) * float(x) + float(y) * float(y);

                    if (texture2D(u_weightTexture, coordinates).x > 0.0 && dist < closestXDistance && airX) {
                        closestXDistance = dist;
                        velocity.x = texture2D(u_velocityTexture, coordinates).r;
                    }

                    if (texture2D(u_weightTexture, coordinates).y > 0.0 && dist < closestYDistance && airY) {
                        closestYDistance = dist;
                        velocity.y = texture2D(u_velocityTexture, coordinates).g;
                    }

                }
            }
        }

    }

    gl_FragColor = vec4(velocity, 0.0, 0.0);
}
