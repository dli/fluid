precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_renderingTexture;
uniform sampler2D u_occlusionTexture;

uniform vec2 u_resolution;
uniform float u_fov;

uniform mat4 u_inverseViewMatrix;

uniform sampler2D u_shadowDepthTexture;
uniform vec2 u_shadowResolution;
uniform mat4 u_lightProjectionViewMatrix;

float linearstep (float left, float right, float x) {
    return clamp((x - left) / (right - left), 0.0, 1.0);
}

vec3 hsvToRGB(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main () {
    vec4 data = texture2D(u_renderingTexture, v_coordinates);
    float occlusion = texture2D(u_occlusionTexture, v_coordinates).r;

    vec3 viewSpaceNormal = vec3(data.x, data.y, sqrt(1.0 - data.x * data.x - data.y * data.y));

    float viewSpaceZ = data.a;
    vec3 viewRay = vec3(
        (v_coordinates.x * 2.0 - 1.0) * tan(u_fov / 2.0) * u_resolution.x / u_resolution.y,
        (v_coordinates.y * 2.0 - 1.0) * tan(u_fov / 2.0),
        -1.0);

    vec3 viewSpacePosition = viewRay * -viewSpaceZ;
    vec3 worldSpacePosition = vec3(u_inverseViewMatrix * vec4(viewSpacePosition, 1.0));

    float speed = data.b;
    vec3 color = hsvToRGB(vec3(max(0.6 - speed * 0.0025, 0.52), 0.75, 1.0));


    vec4 lightSpacePosition = u_lightProjectionViewMatrix * vec4(worldSpacePosition, 1.0);
    lightSpacePosition /= lightSpacePosition.w;
    lightSpacePosition *= 0.5;
    lightSpacePosition += 0.5;
    vec2 lightSpaceCoordinates = lightSpacePosition.xy;
    
    float shadow = 1.0;
    const int PCF_WIDTH = 2;
    const float PCF_NORMALIZATION = float(PCF_WIDTH * 2 + 1) * float(PCF_WIDTH * 2 + 1);

    for (int xOffset = -PCF_WIDTH; xOffset <= PCF_WIDTH; ++xOffset) {
        for (int yOffset = -PCF_WIDTH; yOffset <= PCF_WIDTH; ++yOffset) {
            float shadowSample = texture2D(u_shadowDepthTexture, lightSpaceCoordinates + 5.0 * vec2(float(xOffset), float(yOffset)) / u_shadowResolution).r;
            if (lightSpacePosition.z > shadowSample + 0.001) shadow -= 1.0 / PCF_NORMALIZATION;
        }
    }


    float ambient = 1.0 - occlusion * 0.7;
    float direct = 1.0 - (1.0 - shadow) * 0.8;

    color *= ambient * direct;

    if (speed >= 0.0) {
        gl_FragColor = vec4(color, 1.0);
    } else {
        vec3 backgroundColor = vec3(1.0) - length(v_coordinates * 2.0 - 1.0) * 0.1;
        gl_FragColor = vec4(backgroundColor, 1.0);
    }

    //gl_FragColor = vec4(texture2D(u_shadowDepthTexture, v_coordinates).rrr, 1.0);
}
