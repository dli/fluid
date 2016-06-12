precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_input;

uniform vec2 u_resolution;

const float FXAA_SPAN_MAX = 8.0;
const float FXAA_REDUCE_MUL = 1.0 / 8.0;
const float FXAA_REDUCE_MIN = 1.0 / 128.0;
 
void main () {
    vec2 delta = 1.0 / u_resolution;

    vec3 rgbNW = texture2D(u_input, v_coordinates + vec2(-1.0, -1.0) * delta).rgb;
    vec3 rgbNE = texture2D(u_input, v_coordinates + vec2(1.0, -1.0) * delta).rgb;
    vec3 rgbSW = texture2D(u_input, v_coordinates + vec2(-1.0, 1.0) * delta).rgb;
    vec3 rgbSE = texture2D(u_input, v_coordinates + vec2(1.0, 1.0) * delta).rgb;
    vec3 rgbM = texture2D(u_input, v_coordinates).rgb;

    vec3 luma = vec3(0.299, 0.587, 0.114);
    float lumaNW = dot(rgbNW, luma);
    float lumaNE = dot(rgbNE, luma);
    float lumaSW = dot(rgbSW, luma);
    float lumaSE = dot(rgbSE, luma);
    float lumaM  = dot(rgbM,  luma);

    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    vec2 dir = vec2(
        -((lumaNW + lumaNE) - (lumaSW + lumaSE)),
        ((lumaNW + lumaSW) - (lumaNE + lumaSE)));

    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
    dir = min(vec2(FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX), dir * rcpDirMin)) * delta.xy;

    vec3 rgbA = 0.5 * (texture2D(u_input, v_coordinates.xy + dir * (1.0 / 3.0 - 0.5)).xyz + texture2D(u_input, v_coordinates.xy + dir * (2.0 / 3.0 - 0.5)).xyz);
    vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(u_input, v_coordinates.xy + dir * -0.5).xyz + texture2D(u_input, v_coordinates.xy + dir * 0.5).xyz);
    float lumaB = dot(rgbB, luma);
    if (lumaB < lumaMin || lumaB > lumaMax) {
        gl_FragColor = vec4(rgbA, 1.0);
    } else {
        gl_FragColor = vec4(rgbB, 1.0);
    }
}
