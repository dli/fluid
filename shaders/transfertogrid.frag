//two modes:
//in one we accumulate (xWeight, yWeight, zWeight, centerWeight)
//in the other we accumulate (xWeight * velocity.x, yWeight * velocity.y, zWeight * velocity.z, 0)

//needs a division as a second step

varying vec3 v_position; //already in the grid coordinate system
varying vec3 v_velocity;

uniform vec3 u_gridResolution;

varying float v_zIndex;

uniform int u_accumulate; //when this is 0, we accumulate (xWeight, yWeight, 0, centerWeight), when 1 we accumulate (xWeight * velocity.x, yWeight * velocity.y, 0, 0)

float h (float r) {
    if (r >= 0.0 && r <= 1.0) {
        return 1.0 - r;
    } else if (r >= -1.0 && r <= 0.0) {
        return 1.0 + r;
    } else {
        return 0.0;
    }
}

float k (vec3 v) {
    return h(v.x) * h(v.y) * h(v.z);
}

void main () {
    vec3 cellIndex = floor(get3DFragCoord(u_gridResolution + 1.0));

    if (cellIndex.z == v_zIndex) { //make sure we're in the right slice to prevent bleeding
        //staggered grid position and therefor weight is different for x, y, z and scalar values
        vec3 xPosition = vec3(cellIndex.x, cellIndex.y + 0.5, cellIndex.z + 0.5);
        float xWeight = k(v_position - xPosition);

        vec3 yPosition = vec3(cellIndex.x + 0.5, cellIndex.y, cellIndex.z + 0.5);
        float yWeight = k(v_position - yPosition);

        vec3 zPosition = vec3(cellIndex.x + 0.5, cellIndex.y + 0.5, cellIndex.z);
        float zWeight = k(v_position - zPosition);

        vec3 scalarPosition = vec3(cellIndex.x + 0.5, cellIndex.y + 0.5, cellIndex.z + 0.5);
        float scalarWeight = k(v_position - scalarPosition);

        if (u_accumulate == 0) {
            gl_FragColor = vec4(xWeight, yWeight, zWeight, scalarWeight);
        } else if (u_accumulate == 1) {
            gl_FragColor = vec4(xWeight * v_velocity.x, yWeight * v_velocity.y, zWeight * v_velocity.z, 0.0);
        }

    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
}
