//advects particle positions with second order runge kutta

varying vec2 v_coordinates;

uniform sampler2D u_positionsTexture;
uniform sampler2D u_randomsTexture;

uniform sampler2D u_velocityGrid;

uniform vec3 u_gridResolution;
uniform vec3 u_gridSize;

uniform float u_timeStep;

uniform float u_frameNumber;

uniform vec2 u_particlesResolution;

float sampleXVelocity (vec3 position) {
    vec3 cellIndex = vec3(position.x, position.y - 0.5, position.z - 0.5);
    return texture3D(u_velocityGrid, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).x;
}

float sampleYVelocity (vec3 position) {
    vec3 cellIndex = vec3(position.x - 0.5, position.y, position.z - 0.5);
    return texture3D(u_velocityGrid, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).y;
}

float sampleZVelocity (vec3 position) {
    vec3 cellIndex = vec3(position.x - 0.5, position.y - 0.5, position.z);
    return texture3D(u_velocityGrid, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).z;
}

vec3 sampleVelocity (vec3 position) {
    vec3 gridPosition = (position / u_gridSize) * u_gridResolution;
    return vec3(sampleXVelocity(gridPosition), sampleYVelocity(gridPosition), sampleZVelocity(gridPosition));
}

void main () {
    vec3 position = texture2D(u_positionsTexture, v_coordinates).rgb;
    vec3 randomDirection = texture2D(u_randomsTexture, fract(v_coordinates + u_frameNumber / u_particlesResolution)).rgb;

    vec3 velocity = sampleVelocity(position);

    vec3 halfwayPosition = position + velocity * u_timeStep * 0.5;
    vec3 halfwayVelocity = sampleVelocity(halfwayPosition);

    vec3 step = halfwayVelocity * u_timeStep;

    step += 0.05 * randomDirection * length(velocity) * u_timeStep;

    //step = clamp(step, -vec3(1.0), vec3(1.0)); //enforce CFL condition

    vec3 newPosition = position + step;

    newPosition = clamp(newPosition, vec3(0.01), u_gridSize - 0.01);

    gl_FragColor = vec4(newPosition, 0.0);
}
