precision highp float;

vec3 get3DFragCoord (vec3 resolution) {
    return vec3(
        mod(gl_FragCoord.x, resolution.x),
        gl_FragCoord.y,
        floor(gl_FragCoord.x / resolution.x) + 0.5);
}

vec4 texture3D(sampler2D texture, vec3 coordinates, vec3 resolution) {
    vec3 fullCoordinates = coordinates * resolution; //in [(0, 0, 0), (resolution.x, resolution.y, resolutionz)] 

    fullCoordinates = clamp(fullCoordinates, vec3(0.5), vec3(resolution - 0.5));

    //belowZIndex and aboveZIndex don't have the 0.5 offset
    float belowZIndex = floor(fullCoordinates.z - 0.5);
    float aboveZIndex = belowZIndex + 1.0; 

    //we interpolate the z
    float fraction = fract(fullCoordinates.z - 0.5);

    vec2 belowCoordinates = vec2(
        belowZIndex * resolution.x + fullCoordinates.x,
        fullCoordinates.y) / vec2(resolution.x * resolution.z, resolution.y);

    vec2 aboveCoordinates = vec2(
        aboveZIndex * resolution.x + fullCoordinates.x,
        fullCoordinates.y) / vec2(resolution.x * resolution.z, resolution.y);

    return mix(texture2D(texture, belowCoordinates), texture2D(texture, aboveCoordinates), fraction);
}

vec4 texture3DNearest(sampler2D texture, vec3 coordinates, vec3 resolution) { //clamps the z coordinate
    vec3 fullCoordinates = coordinates * resolution; //in [(0, 0, 0), (resolution.x, resolution.y, resolutionz)] 

    fullCoordinates = clamp(fullCoordinates, vec3(0.5), vec3(resolution - 0.5));

    float zIndex = floor(fullCoordinates.z);

    vec2 textureCoordinates = vec2(
        zIndex * resolution.x + fullCoordinates.x,
        fullCoordinates.y) / vec2(resolution.x * resolution.z, resolution.y);

    return texture2D(texture, textureCoordinates);
}

/*
vec4 texture3D(sampler2D tex, vec3 texCoord, vec3 resolution) {
    float size = resolution.z;
   float sliceSize = 1.0 / size;                         // space of 1 slice
   float slicePixelSize = sliceSize / size;              // space of 1 pixel
   float sliceInnerSize = slicePixelSize * (size - 1.0); // space of size pixels
   float zSlice0 = min(floor(texCoord.z * size), size - 1.0);
   float zSlice1 = min(zSlice0 + 1.0, size - 1.0);
   float xOffset = slicePixelSize * 0.5 + texCoord.x * sliceInnerSize;
   float s0 = xOffset + (zSlice0 * sliceSize);
   float s1 = xOffset + (zSlice1 * sliceSize);
   vec4 slice0Color = texture2D(tex, vec2(s0, texCoord.y));
   vec4 slice1Color = texture2D(tex, vec2(s1, texCoord.y));
   float zOffset = mod(texCoord.z * size, 1.0);
   return mix(slice0Color, slice1Color, zOffset);
}
*/

