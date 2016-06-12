precision highp float;

uniform sampler2D u_renderingTexture;

varying vec3 v_viewSpaceSpherePosition;
varying float v_sphereRadius;
varying float v_extrudedSphereRadius;

uniform vec2 u_resolution;
uniform float u_fov;

const float PI = 3.14159265;

void main () {
    vec2 coordinates = gl_FragCoord.xy / u_resolution;
    vec4 data = texture2D(u_renderingTexture, coordinates);

    //reconstruct position

    vec3 viewSpaceNormal = vec3(data.x, data.y, sqrt(1.0 - data.x * data.x - data.y * data.y));

    float tanHalfFOV = tan(u_fov / 2.0);
    float viewSpaceZ = data.a;
    vec3 viewRay = vec3(
        (coordinates.x * 2.0 - 1.0) * tanHalfFOV * u_resolution.x / u_resolution.y,
        (coordinates.y * 2.0 - 1.0) * tanHalfFOV,
        -1.0);

    vec3 viewSpacePosition = viewRay * -viewSpaceZ;


    vec3 di = v_viewSpaceSpherePosition - viewSpacePosition;
    float l = length(di);

    float nl = dot(viewSpaceNormal, di / l);
    float h = l / v_sphereRadius;
    float h2 = h * h;
    float k2 = 1.0 - h2 * nl * nl;

    float result = max(0.0, nl) / h2;

    if (k2 > 0.0 && l > v_sphereRadius) {
        result = nl * acos(-nl * sqrt((h2 - 1.0) / (1.0 - nl * nl))) - sqrt(k2 * (h2 - 1.0));
        result = result / h2 + atan(sqrt(k2 / (h2 - 1.0)));
        result /= PI;

        //result = pow( clamp(0.5*(nl*h+1.0)/h2,0.0,1.0), 1.5 ); //cheap approximation
    }

    gl_FragColor = vec4(result, 0.0, 0.0, 1.0);


}
