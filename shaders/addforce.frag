precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_velocityTexture;

uniform vec3 u_mouseVelocity;

uniform vec3 u_gridResolution;
uniform vec3 u_gridSize;

uniform vec3 u_mouseRayOrigin;
uniform vec3 u_mouseRayDirection;

uniform float u_timeStep;

float kernel (vec3 position, float radius) {
    vec3 worldPosition = (position / u_gridResolution) * u_gridSize;

    float distanceToMouseRay = length(cross(u_mouseRayDirection, worldPosition - u_mouseRayOrigin));

    float normalizedDistance = max(0.0, distanceToMouseRay / radius);
    return smoothstep(1.0, 0.9, normalizedDistance);
}

void main () {
    vec3 velocity = texture2D(u_velocityTexture, v_coordinates).rgb;

    vec3 newVelocity = velocity + vec3(0.0, -40.0 * u_timeStep, 0.0); //add gravity

    vec3 cellIndex = floor(get3DFragCoord(u_gridResolution + 1.0));
    vec3 xPosition = vec3(cellIndex.x, cellIndex.y + 0.5, cellIndex.z + 0.5);
    vec3 yPosition = vec3(cellIndex.x + 0.5, cellIndex.y, cellIndex.z + 0.5);
    vec3 zPosition = vec3(cellIndex.x + 0.5, cellIndex.y + 0.5, cellIndex.z);

    float mouseRadius = 5.0;
    vec3 kernelValues = vec3(kernel(xPosition, mouseRadius), kernel(yPosition, mouseRadius), kernel(zPosition, mouseRadius));

    newVelocity += u_mouseVelocity * kernelValues * 3.0 * smoothstep(0.0, 1.0 / 200.0, u_timeStep);

    gl_FragColor = vec4(newVelocity * 1.0, 0.0);
}
