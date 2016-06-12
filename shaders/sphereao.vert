precision highp float;

attribute vec3 a_vertexPosition;

attribute vec2 a_textureCoordinates;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

uniform sampler2D u_positionsTexture;
uniform sampler2D u_velocitiesTexture;

uniform float u_sphereRadius;

varying vec3 v_viewSpaceSpherePosition;
varying float v_sphereRadius;
varying float v_extrudedSphereRadius;

void main () {
    vec3 spherePosition = texture2D(u_positionsTexture, a_textureCoordinates).rgb;
    v_viewSpaceSpherePosition = vec3(u_viewMatrix * vec4(spherePosition, 1.0));

    v_sphereRadius = u_sphereRadius;
    v_extrudedSphereRadius = v_sphereRadius * 5.0;
    
    vec3 position = a_vertexPosition * v_extrudedSphereRadius + spherePosition;

    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(position, 1.0);
}
