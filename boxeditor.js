var BoxEditor = (function () {

    //min and max are both number[3]
    function AABB (min, max) {
        this.min = [min[0], min[1], min[2]];
        this.max = [max[0], max[1], max[2]];
    }

    AABB.prototype.computeVolume = function () {
        var volume = 1;
        for (var i = 0; i < 3; ++i) {
            volume *= (this.max[i] - this.min[i]);
        }
        return volume;
    }

    AABB.prototype.computeSurfaceArea = function () {
        var width = this.max[0] - this.min[0];
        var height = this.max[1] - this.min[1];
        var depth = this.max[2] - this.min[2];

        return 2 * (width * height + width * depth + height * depth);
    }

    //returns new AABB with the same min and max (but not the same array references)
    AABB.prototype.clone = function () {
        return new AABB(
            [this.min[0], this.min[1], this.min[2]],
            [this.max[0], this.max[1], this.max[2]]
        );
    }

    AABB.prototype.randomPoint = function () { //random point in this AABB
        var point = [];
        for (var i = 0; i < 3; ++i) {
            point[i] = this.min[i] + Math.random() * (this.max[i] - this.min[i]);
        }
        return point;
    }

    var InteractionMode = {
        RESIZING: 0,
        TRANSLATING: 1,

        DRAWING: 2, //whilst we're drawing a rectangle on a plane
        EXTRUDING: 3 //whilst we're extruding that rectangle into a box
    };

    var STEP = 1.0;
        

    function exclusiveAABBOverlap (a, b) {
        return a.min[0] < b.max[0] && a.max[0] > b.min[0] &&
                a.min[1] < b.max[1] && a.max[1] > b.min[1] &&
                a.min[2] < b.max[2] && a.max[2] > b.min[2];
    }

    function inclusiveAABBOverlap (a, b) {
        return a.min[0] <= b.max[0] && a.max[0] >= b.min[0] &&
                a.min[1] <= b.max[1] && a.max[1] >= b.min[1] &&
                a.min[2] <= b.max[2] && a.max[2] >= b.min[2];
    }


    /*
        if there is an intersection then this returns:
            {
                aabb: aabb,
                t: distance to intersection,

                point: point of intersection,

                //axis and side together define the plane of intersection (+x, -x, etc)
                axis: 0, 1 or 2 depending on x, y or z,
                side: -1 or 1 depending on which side the intersection happened on
            }


        otherwise it returns null
    */

    function rayAABBIntersection (rayOrigin, rayDirection, aabb) {
        //we see it as a series of clippings in t of the line in the AABB planes along each axis
        //the part we are left with after clipping if successful is the region of the line within the AABB and thus we can extract the intersection

        //the part of the line we have clipped so far
        var lowT = -Infinity;
        var highT = Infinity;

        var intersectionAxis = 0;

        for (var i = 0; i < 3; ++i) {
            var t1 = (aabb.min[i] - rayOrigin[i]) / rayDirection[i];
            var t2 = (aabb.max[i] - rayOrigin[i]) / rayDirection[i];
            //so between t1 and t2 we are within the aabb planes in this dimension

            //ensure t1 < t2 (swap if necessary)
            if (t1 > t2) {
                var temp = t1;
                t1 = t2;
                t2 = temp;
            }

            //t1 and t2 now hold the lower and upper intersection t's respectively

            //the part of the line we just clipped for does not overlap the part previously clipped and thus there is no intersection 
            if (t2 < lowT || t1 > highT) return null;

            //further clip the line between the planes in this axis
            if (t1 > lowT) {
                lowT = t1;

                intersectionAxis = i; //if we needed to futher clip in this axis then this is the closest intersection axis
            }

            if (t2 < highT) highT = t2;
        }

        if (lowT > highT) return null;

        //if we've reached this far then there is an intersection

        var intersection = [];
        for (var i = 0; i < 3; ++i) {
            intersection[i] = rayOrigin[i] + rayDirection[i] * lowT;
        }


        return {
            aabb: aabb,
            t: lowT,
            axis: intersectionAxis,
            side: rayDirection[intersectionAxis] > 0 ? -1 : 1,
            point: intersection
        };
    }

    //finds the closest points between the line1 and line2
    //returns [closest point on line1, closest point on line2]
    function closestPointsOnLines (line1Origin, line1Direction, line2Origin, line2Direction) {
        var w0 = Utilities.subtractVectors([], line1Origin, line2Origin);

        var a = Utilities.dotVectors(line1Direction, line1Direction);
        var b = Utilities.dotVectors(line1Direction, line2Direction);
        var c = Utilities.dotVectors(line2Direction, line2Direction);
        var d = Utilities.dotVectors(line1Direction, w0);
        var e = Utilities.dotVectors(line2Direction, w0);


        var t1 = (b * e - c * d) / (a * c - b * b);
        var t2 = (a * e - b * d) / (a * c - b * b);

        return [
            Utilities.addVectors([], line1Origin, Utilities.multiplyVectorByScalar([], line1Direction, t1)),
            Utilities.addVectors([], line2Origin, Utilities.multiplyVectorByScalar([], line2Direction, t2))
        ];
    }

    //this defines the bounds of our editing space
    //the grid starts at (0, 0, 0)
    //gridSize is [width, height, depth]
    //onChange is a callback that gets called anytime a box gets edited
    function BoxEditor (canvas, wgl, projectionMatrix, camera, gridSize, onLoaded, onChange) {
        this.canvas = canvas;

        this.wgl = wgl;

        this.gridWidth = gridSize[0];
        this.gridHeight = gridSize[1];
        this.gridDepth = gridSize[2];
        this.gridDimensions = [this.gridWidth, this.gridHeight, this.gridDepth];

        this.projectionMatrix = projectionMatrix;
        this.camera = camera;

        this.onChange = onChange;

        //the cube geometry is a 1x1 cube with the origin at the bottom left corner

        this.cubeVertexBuffer = wgl.createBuffer();
        wgl.bufferData(this.cubeVertexBuffer, wgl.ARRAY_BUFFER, new Float32Array([
              // Front face
              0.0, 0.0,  1.0,
               1.0, 0.0,  1.0,
               1.0,  1.0,  1.0,
              0.0,  1.0,  1.0,
              
              // Back face
              0.0, 0.0, 0.0,
              0.0,  1.0, 0.0,
               1.0,  1.0, 0.0,
               1.0, 0.0, 0.0,
              
              // Top face
              0.0,  1.0, 0.0,
              0.0,  1.0,  1.0,
               1.0,  1.0,  1.0,
               1.0,  1.0, 0.0,
              
              // Bottom face
              0.0, 0.0, 0.0,
               1.0, 0.0, 0.0,
               1.0, 0.0,  1.0,
              0.0, 0.0,  1.0,
              
              // Right face
               1.0, 0.0, 0.0,
               1.0,  1.0, 0.0,
               1.0,  1.0,  1.0,
               1.0, 0.0,  1.0,
              
              // Left face
              0.0, 0.0, 0.0,
              0.0, 0.0,  1.0,
              0.0,  1.0,  1.0,
              0.0,  1.0, 0.0
            ]), wgl.STATIC_DRAW);



        this.cubeIndexBuffer = wgl.createBuffer();
        wgl.bufferData(this.cubeIndexBuffer, wgl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23    // left
        ]), wgl.STATIC_DRAW);


        this.cubeWireframeVertexBuffer = wgl.createBuffer();
        wgl.bufferData(this.cubeWireframeVertexBuffer, wgl.ARRAY_BUFFER, new Float32Array([
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 1.0, 0.0,
            0.0, 1.0, 0.0,

            0.0, 0.0, 1.0,
            1.0, 0.0, 1.0,
            1.0, 1.0, 1.0,
            0.0, 1.0, 1.0]), wgl.STATIC_DRAW);

        this.cubeWireframeIndexBuffer = wgl.createBuffer();
        wgl.bufferData(this.cubeWireframeIndexBuffer, wgl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
            0, 1, 1, 2, 2, 3, 3, 0,
            4, 5, 5, 6, 6, 7, 7, 4,
            0, 4, 1, 5, 2, 6, 3, 7
        ]), wgl.STATIC_DRAW);


        //there's one grid vertex buffer for the planes normal to each axis 
        this.gridVertexBuffers = [];

        for (var axis = 0; axis < 3; ++axis) {
            this.gridVertexBuffers[axis] = wgl.createBuffer();

            var vertexData = [];
            

            var points; //the points that make up this grid plane

            if (axis === 0) {

                points = [
                    [0, 0, 0],
                    [0, this.gridHeight, 0],
                    [0, this.gridHeight, this.gridDepth],
                    [0, 0, this.gridDepth]
                ];

            } else if (axis === 1) {
                points = [
                    [0, 0, 0],
                    [this.gridWidth, 0, 0],
                    [this.gridWidth, 0, this.gridDepth],
                    [0, 0, this.gridDepth]
                ];
            } else if (axis === 2) {

                points = [
                    [0, 0, 0],
                    [this.gridWidth, 0, 0],
                    [this.gridWidth, this.gridHeight, 0],
                    [0, this.gridHeight, 0]
                ];
            }


            for (var i = 0; i < 4; ++i) {
                vertexData.push(points[i][0]);
                vertexData.push(points[i][1]);
                vertexData.push(points[i][2]);

                vertexData.push(points[(i + 1) % 4][0]);
                vertexData.push(points[(i + 1) % 4][1]);
                vertexData.push(points[(i + 1) % 4][2]);
            }
            

            wgl.bufferData(this.gridVertexBuffers[axis], wgl.ARRAY_BUFFER, new Float32Array(vertexData), wgl.STATIC_DRAW);
        }

        this.pointVertexBuffer = wgl.createBuffer();
        wgl.bufferData(this.pointVertexBuffer, wgl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0]), wgl.STATIC_DRAW);


        this.quadVertexBuffer = wgl.createBuffer();
        wgl.bufferData(this.quadVertexBuffer, wgl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]), wgl.STATIC_DRAW);


        /////////////////////////////////////////////////
        // box state

        this.boxes = [];


        ////////////////////////////////////////////////
        // interaction stuff

        //mouse x and y are in [-1, 1] (clip space)
        this.mouseX = 999;
        this.mouseY = 999;

        this.keyPressed = []; //an array of booleans that maps a key code to whether or not it's pressed
        for (var i = 0; i < 256; ++i) {
            this.keyPressed[i] = false;
        }

        /*
        interactions:
        click on a plane and hold down to begin drawing
        when mouse is released we enter extrusion mode for new box
        click again to create box

        click and drag on side of boxes to resize

        click and drag on side of boxes whilst holding shift to move

        
        //while we're not interacting, this is null
        //while we are interacting this contains an object
        /*

            {
                mode: the interaction mode,

                during resizing or translating or extrusion:
                    box: box we're currently manipulating,
                    axis: axis of plane we're manipulating: 0, 1 or 2
                    side: side of plane we're manipulating: -1 or 1
                    point: the point at which the interaction started


                during translation we also have:
                    startMax: the starting max along the interaction axis
                    startMin: the starting min along the interaction axis


                during drawing
                    box: box we're currently drawing
                    point: the point at which we started drawing
                    axis: the axis of the plane which we're drawing on
                    side: the side of the plane which we're drawin on

            }
        */
        this.interactionState = null;


        ///////////////////////////////////
        // load programs


        wgl.createProgramsFromFiles({
            backgroundProgram: {
                vertexShader: 'shaders/background.vert',
                fragmentShader: 'shaders/background.frag'
            },
            boxProgram: {
                vertexShader: 'shaders/box.vert',
                fragmentShader: 'shaders/box.frag'
            },
            boxWireframeProgram: {
                vertexShader: 'shaders/boxwireframe.vert',
                fragmentShader: 'shaders/boxwireframe.frag'
            },
            gridProgram: {
                vertexShader: 'shaders/grid.vert',
                fragmentShader: 'shaders/grid.frag'
            },
            pointProgram: {
                vertexShader: 'shaders/point.vert',
                fragmentShader: 'shaders/point.frag'
            }
        }, (function (programs) {
            for (var programName in programs) {
                this[programName] = programs[programName];
            }

            onLoaded(); 
        }).bind(this));
    }

    function quantize (x, step) {
        return Math.round(x / step) * step;
    }

    function quantizeVector (v, step) {
        for (var i = 0; i < v.length; ++i) {
            v[i] = quantize(v[i], step);
        }

        return v;
    }

    BoxEditor.prototype.onKeyDown = function (event) {
        this.keyPressed[event.keyCode] = true;
    }

    BoxEditor.prototype.onKeyUp = function (event) {
        this.keyPressed[event.keyCode] = false;
    }

    BoxEditor.prototype.onMouseMove = function (event) {
        event.preventDefault();

        var position = Utilities.getMousePosition(event, this.canvas);
        var normalizedX = position.x / this.canvas.width;
        var normalizedY = position.y / this.canvas.height;

        this.mouseX = normalizedX * 2.0 - 1.0;
        this.mouseY = (1.0 - normalizedY) * 2.0 - 1.0;



        if (this.interactionState !== null) {
            this.onChange();

            if (this.interactionState.mode === InteractionMode.RESIZING || this.interactionState.mode === InteractionMode.EXTRUDING) {
                var mouseRay = this.getMouseRay();

                //so when we are dragging to make a box bigger or smaller, what we do is we extend a line out from the intersection point normal to the plane

                var dragLineOrigin = this.interactionState.point;
                var dragLineDirection = [0, 0, 0];
                dragLineDirection[this.interactionState.axis] = 1.0;

                //then we find the closest point between the mouse ray and this line and use that to determine how far we've 'dragged'
                var closestPoints = closestPointsOnLines(dragLineOrigin, dragLineDirection, mouseRay.origin, mouseRay.direction);
                var newCoordinate = closestPoints[0][this.interactionState.axis]; //the new coordinate for this box plane
                newCoordinate = quantize(newCoordinate, STEP);

                var box = this.interactionState.box,
                    side = this.interactionState.side,
                    axis = this.interactionState.axis;

                //resize the box, clamping it to itself and the overall grid
                if (side === -1) {
                    box.min[axis] = Math.max(Math.min(newCoordinate, box.max[axis]), 0);
                } else if (side === 1) {
                    box.max[axis] = Math.min(Math.max(newCoordinate, box.min[axis]), this.gridDimensions[axis]);
                }

                //collision detection
                for (var i = 0; i < this.boxes.length; ++i) {
                    var otherBox = this.boxes[i];
                    if (box !== otherBox) { //don't collide with self
                        if (exclusiveAABBOverlap(box, otherBox)) {

                            //resolve collision
                            if (side === -1) {
                                box.min[axis] = otherBox.max[axis]; 
                            } else if (side === 1) {
                                box.max[axis] = otherBox.min[axis];
                            }
                        }
                    }
                }

            } else if (this.interactionState.mode === InteractionMode.TRANSLATING) {

                var mouseRay = this.getMouseRay();

                //so when we are translating a box, what we do is we extend a line out from the intersection point normal to the plane

                var dragLineOrigin = this.interactionState.point;
                var dragLineDirection = [0, 0, 0];
                dragLineDirection[this.interactionState.axis] = 1.0;

                //then we find the closest point between the mouse ray and this line and use that to determine how far we've 'dragged'
                var closestPoints = closestPointsOnLines(dragLineOrigin, dragLineDirection, mouseRay.origin, mouseRay.direction);
                var newCoordinate = closestPoints[0][this.interactionState.axis]; //the new coordinate for this box plane
                newCoordinate = quantize(newCoordinate, STEP);

                var box = this.interactionState.box,
                    side = this.interactionState.side,
                    axis = this.interactionState.axis;
                
                
                var length = this.interactionState.startMax - this.interactionState.startMin; //the length of the box along the translation axis

                if (side === -1) {
                    box.min[axis] = newCoordinate;
                    box.max[axis] = newCoordinate + length;
                } else if (side === 1) {
                    box.max[axis] = newCoordinate;
                    box.min[axis] = newCoordinate - length;
                }

                //clamp to boundaries
                if (box.min[axis] < 0) {
                    box.min[axis] = 0;
                    box.max[axis] = length;
                }

                if (box.max[axis] > this.gridDimensions[axis]) {
                    box.max[axis] = this.gridDimensions[axis];
                    box.min[axis] = this.gridDimensions[axis] - length;
                }

                
                var translationDirection = 0; //is either -1 or 1 depending on which way we're pushing our box
                //how we resolve collisions depends on our translation direction
                if (side === -1) {
                    translationDirection = newCoordinate < this.interactionState.startMin ? -1 : 1;
                } else if (side === 1) {
                    translationDirection = newCoordinate < this.interactionState.startMax ? -1 : 1;
                }

                
                var sweptBox = box.clone(); //we sweep out translating AABB for collision detection to prevent ghosting through boxes
                //reset swept box to original box location before translation
                sweptBox.min[axis] = this.interactionState.startMin;
                sweptBox.max[axis] = this.interactionState.startMax;

                //sweep out the correct plane to where it has been translated to
                if (translationDirection === 1) {
                    sweptBox.max[axis] = box.max[axis];
                } else if (translationDirection === -1) {
                    sweptBox.min[axis] = box.min[axis];
                }
                
                //collision detection
                for (var i = 0; i < this.boxes.length; ++i) {
                    var otherBox = this.boxes[i];
                    if (box !== otherBox) { //don't collide with self
                        if (exclusiveAABBOverlap(sweptBox, otherBox)) {

                            //resolve collision
                            if (translationDirection === -1) {
                                box.min[axis] = otherBox.max[axis]; 
                                box.max[axis] = otherBox.max[axis] + length;
                            } else if (translationDirection === 1) {
                                box.max[axis] = otherBox.min[axis];
                                box.min[axis] = otherBox.min[axis] - length;
                            }
                        }
                    }
                }

            } else if (this.interactionState.mode === InteractionMode.DRAWING) {
        
                var mouseRay = this.getMouseRay();

                //get the mouse ray intersection with the drawing plane

                var axis = this.interactionState.axis,
                    side = this.interactionState.side,
                    startPoint = this.interactionState.point;

                var planeCoordinate = side === -1 ? 0 : this.gridDimensions[axis];
                var t = (planeCoordinate - mouseRay.origin[axis]) / mouseRay.direction[axis];

                if (t > 0) { //if the mouse ray misses the drawing plane then the box just stays the same size as it was before

                    var intersection = Utilities.addVectors([], mouseRay.origin, Utilities.multiplyVectorByScalar([], mouseRay.direction, t));
                    quantizeVector(intersection, STEP);

                    for (var i = 0; i < 3; ++i) {
                        intersection[i] = Utilities.clamp(intersection[i], 0, this.gridDimensions[i]);
                        intersection[i] = Utilities.clamp(intersection[i], 0, this.gridDimensions[i]);
                    }

                    var min = [Math.min(startPoint[0], intersection[0]), Math.min(startPoint[1], intersection[1]), Math.min(startPoint[2], intersection[2])];
                    var max = [Math.max(startPoint[0], intersection[0]), Math.max(startPoint[1], intersection[1]), Math.max(startPoint[2], intersection[2])];


                    var box = this.interactionState.box;

                    var sweptBox = new AABB(min, max); //we sweep the box a bit into the grid to make sure it collides along the plane axis
                    if (this.interactionState.side === -1) {
                        sweptBox.max[this.interactionState.axis] = STEP * 0.1;
                    } else {
                        sweptBox.min[this.interactionState.axis] = this.gridDimensions[this.interactionState.axis] - STEP * 0.1;

                    }

                    //collision detection
                    for (var i = 0; i < this.boxes.length; ++i) {
                        var otherBox = this.boxes[i];

                        if (box !== otherBox) { //don't collide with self
                            if (exclusiveAABBOverlap(sweptBox, otherBox)) {
                                
                                //we resolve along the axis with the smaller overlap and where the start point doesn't already overlap the other box in that axis
                                var smallestOverlap = 99999999;
                                var smallestOverlapAxis = -1;

                                for (var axis = 0; axis < 3; ++axis) {
                                    if (axis !== this.interactionState.axis) { //only resolve collisions in the drawing plane
                                        var overlap = Math.min(max[axis], otherBox.max[axis]) - Math.max(min[axis], otherBox.min[axis]);

                                        if (overlap > 0 && overlap < smallestOverlap && (startPoint[axis] < otherBox.min[axis] || startPoint[axis] > otherBox.max[axis])) {
                                            smallestOverlap = overlap;
                                            smallestOverlapAxis = axis;
                                        }
                                    }
                                }

                                if (intersection[smallestOverlapAxis] > startPoint[smallestOverlapAxis]) { //if we're resizing in the positive direction
                                    max[smallestOverlapAxis] = otherBox.min[smallestOverlapAxis];
                                } else { //if we're resizing in the negative direction
                                    min[smallestOverlapAxis] = otherBox.max[smallestOverlapAxis];
                                }
                            }
                        }
                    }

                    this.interactionState.box.min = min;
                    this.interactionState.box.max = max;

                }
            }
        }

        this.camera.onMouseMove(event);
    }

    //returns the closest box intersection data (same as rayAABBIntersection) for the given ray
    //if there is no intersection it returns null
    BoxEditor.prototype.getBoxIntersection = function (rayOrigin, rayDirection) {
        //find the closest box that this collides with

        var bestIntersectionSoFar = {
            aabb: null,
            t: Infinity
        }

        for (var i = 0; i < this.boxes.length; ++i) {
            var box = this.boxes[i];

            var intersection = rayAABBIntersection(rayOrigin, rayDirection, box);

            if (intersection !== null) { //if there is an intersection
                if (intersection.t < bestIntersectionSoFar.t) { //if this is closer than the best we've seen so far
                    bestIntersectionSoFar = intersection;
                }
            }
        }

        if (bestIntersectionSoFar.aabb === null) { //if we didn't intersect any boxes
            return null;
        } else {
            return bestIntersectionSoFar;
        }
    }

    //tests for intersection with one of the bounding planes
    /*
    if there is an intersection returns
    {axis, side, point}
    otherwise, returns null
    */
    BoxEditor.prototype.getBoundingPlaneIntersection = function (rayOrigin, rayDirection) {
        //we try to intersect with the two planes on each axis in turn (as long as they are facing towards the camera)
        //we assume we could only ever intersect with one of the planes so we break out as soon as we've found something

        for (var axis = 0; axis < 3; ++axis) {

            //now let's try intersecting with each side in turn
            for (var side = -1; side <= 1; side += 2) { //goes between -1 and 1 (hackish!

                //first let's make sure the plane is front facing to the ray
                var frontFacing = side === -1 ? rayDirection[axis] < 0 : rayDirection[axis] > 0;
                if (frontFacing) {
                    var planeCoordinate = side === -1 ? 0 : this.gridDimensions[axis]; //the coordinate of the plane along this axis

                    var t = (planeCoordinate - rayOrigin[axis]) / rayDirection[axis];


                    if (t > 0) {
                        var intersection = Utilities.addVectors([], rayOrigin, Utilities.multiplyVectorByScalar([], rayDirection, t));

                        //if we're still within the bounds of the grid
                        if (intersection[0] >= 0.0 && intersection[0] <= this.gridDimensions[0] &&
                            intersection[1] >= 0.0 && intersection[1] <= this.gridDimensions[1] &&
                            intersection[2] >= 0.0 && intersection[2] <= this.gridDimensions[2]) {
                            
                            return {
                                axis: axis,
                                side: side,
                                point: intersection
                            }
                        }
                    }
                }
            }
        }

        return null; //no intersection found
    }


    BoxEditor.prototype.onMouseDown = function (event) {
        event.preventDefault();

        this.onMouseMove(event);

        if (!this.keyPressed[32]) { //if space isn't held down

            //we've finished extruding a box
            if (this.interactionState !== null && this.interactionState.mode === InteractionMode.EXTRUDING) {
                //delete zero volume boxes
                if (this.interactionState.box.computeVolume() === 0) {
                    this.boxes.splice(this.boxes.indexOf(this.interactionState.box), 1);
                }
                this.interactionState = null;

                this.onChange();

                return;
            } else {

                var mouseRay = this.getMouseRay();

                //find the closest box that this collides with

                var boxIntersection = this.getBoxIntersection(mouseRay.origin, mouseRay.direction);


                //if we've intersected at least one box then let's start manipulating that box
                if (boxIntersection !== null) {
                    var intersection = boxIntersection;

                    if (this.keyPressed[16]) { //if we're holding shift we start to translate
                        this.interactionState = {
                            mode: InteractionMode.TRANSLATING,
                            box: intersection.aabb,
                            axis: intersection.axis,
                            side: intersection.side,
                            point: intersection.point,

                            startMax: intersection.aabb.max[intersection.axis],
                            startMin: intersection.aabb.min[intersection.axis]
                        };
                    } else { //otherwise we start resizing

                        this.interactionState = {
                            mode: InteractionMode.RESIZING,
                            box: intersection.aabb,
                            axis: intersection.axis,
                            side: intersection.side,
                            point: intersection.point
                        };
                    }
                }


                //if we've not intersected any box then let's see if we should start the box creation process
                if (boxIntersection === null) {
                    var mouseRay = this.getMouseRay();

                    var planeIntersection = this.getBoundingPlaneIntersection(mouseRay.origin, mouseRay.direction);

                    if (planeIntersection !== null) { //if we've hit one of the planes
                        //go into drawing mode
                        
                        var point = planeIntersection.point;
                        point[0] = quantize(point[0], STEP);
                        point[1] = quantize(point[1], STEP);
                        point[2] = quantize(point[2], STEP);

                        var newBox = new AABB(point, point);
                        this.boxes.push(newBox);

                        this.interactionState = {
                            mode: InteractionMode.DRAWING,
                            box: newBox,
                            axis: planeIntersection.axis,
                            side: planeIntersection.side,
                            point: planeIntersection.point
                        };
                    }

                    this.onChange();
                }

            }

        }
        
        if (this.interactionState === null) {
            this.camera.onMouseDown(event);
        }

    }

    BoxEditor.prototype.onMouseUp = function (event) {
        event.preventDefault();

        if (this.interactionState !== null) {
            if (this.interactionState.mode === InteractionMode.RESIZING) { //the end of a resize
                //if we've resized to zero volume then we delete the box
                if (this.interactionState.box.computeVolume() === 0) {
                    this.boxes.splice(this.boxes.indexOf(this.interactionState.box), 1);
                }

                this.interactionState = null;

            } else if (this.interactionState.mode === InteractionMode.TRANSLATING) { //the end of a translate
                this.interactionState = null;
            } else if (this.interactionState.mode === InteractionMode.DRAWING) { //the end of a draw
                //TODO: DRY this

                if (this.interactionState.box.computeSurfaceArea() > 0) { //make sure we have something to extrude

                    var mouseRay = this.getMouseRay();

                    var axis = this.interactionState.axis,
                        side = this.interactionState.side,
                        startPoint = this.interactionState.point;

                    var planeCoordinate = side === -1 ? 0 : this.gridDimensions[axis];
                    var t = (planeCoordinate - mouseRay.origin[axis]) / mouseRay.direction[axis];

                    var intersection = Utilities.addVectors([], mouseRay.origin, Utilities.multiplyVectorByScalar([], mouseRay.direction, t));
                    quantizeVector(intersection, STEP);
        
                    //clamp extrusion point to grid and to box
                    for (var i = 0; i < 3; ++i) {
                        intersection[i] = Utilities.clamp(intersection[i], 0, this.gridDimensions[i]);
                        intersection[i] = Utilities.clamp(intersection[i], this.interactionState.box.min[i], this.interactionState.box.max[i]);
                    }


                    //go into extrusion mode
                    this.interactionState = {
                        mode: InteractionMode.EXTRUDING,
                        box: this.interactionState.box,
                        axis: this.interactionState.axis,
                        side: this.interactionState.side * -1,
                        point: intersection
                    };

                } else { //otherwise delete the box we were editing and go straight back into regular mode
                    this.boxes.splice(this.boxes.indexOf(this.interactionState.box), 1);
                    this.interactionState = null;
                }
            }

            this.onChange();
        }


        if (this.interactionState === null) {
            this.camera.onMouseUp(event);
        }
    }


    //returns an object
    /*
        {
            origin: [x, y, z],
            direction: [x, y, z] //normalized
        }
    */
    BoxEditor.prototype.getMouseRay = function () {
        var fov = 2.0 * Math.atan(1.0 / this.projectionMatrix[5]);

        var viewSpaceMouseRay = [
            this.mouseX * Math.tan(fov / 2.0) * (this.canvas.width / this.canvas.height),
            this.mouseY * Math.tan(fov / 2.0),
            -1.0];

        var inverseViewMatrix = Utilities.invertMatrix([], this.camera.getViewMatrix());
        var mouseRay = Utilities.transformDirectionByMatrix([], viewSpaceMouseRay, inverseViewMatrix);
        Utilities.normalizeVector(mouseRay, mouseRay);


        var rayOrigin = this.camera.getPosition();

        return {
            origin: rayOrigin,
            direction: mouseRay
        };
    }

    BoxEditor.prototype.draw = function () {
        var wgl = this.wgl;

        wgl.clear(
            wgl.createClearState().bindFramebuffer(null).clearColor(0.9, 0.9, 0.9, 1.0),
            wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT);

        /////////////////////////////////////////////
        //draw background

        var backgroundDrawState = wgl.createDrawState()
            .bindFramebuffer(null)
            .viewport(0, 0, this.canvas.width, this.canvas.height)

            .useProgram(this.backgroundProgram)

            .vertexAttribPointer(this.quadVertexBuffer, this.backgroundProgram.getAttribLocation('a_position'), 2, wgl.FLOAT, wgl.FALSE, 0, 0);

        wgl.drawArrays(backgroundDrawState, wgl.TRIANGLE_STRIP, 0, 4);


        /////////////////////////////////////////////
        //draw grid

        for (var axis = 0; axis < 3; ++axis) {
            for (var side = 0; side <= 1; ++side) {
                var cameraPosition = this.camera.getPosition();

                var planePosition = [this.gridWidth / 2, this.gridHeight / 2, this.gridDepth / 2];
                planePosition[axis] = side === 0 ? 0 : this.gridDimensions[axis];
                
                var cameraDirection = Utilities.subtractVectors([], planePosition, cameraPosition);

                var gridDrawState = wgl.createDrawState()
                    .bindFramebuffer(null)
                    .viewport(0, 0, this.canvas.width, this.canvas.height)

                    .useProgram(this.gridProgram)

                    .vertexAttribPointer(this.gridVertexBuffers[axis], this.gridProgram.getAttribLocation('a_vertexPosition'), 3, wgl.FLOAT, wgl.FALSE, 0, 0)

                    .uniformMatrix4fv('u_projectionMatrix', false, this.projectionMatrix)
                    .uniformMatrix4fv('u_viewMatrix', false, this.camera.getViewMatrix());

                var translation = [0, 0, 0];
                translation[axis] = side * this.gridDimensions[axis];

                gridDrawState.uniform3f('u_translation', translation[0], translation[1], translation[2]);


                if (side === 0 && cameraDirection[axis] <= 0 || side === 1 && cameraDirection[axis] >= 0) {
                    wgl.drawArrays(gridDrawState, wgl.LINES, 0, 8);
                }
            }
        }


        ///////////////////////////////////////////////
        //draw boxes and point

        var boxDrawState = wgl.createDrawState()
            .bindFramebuffer(null)
            .viewport(0, 0, this.canvas.width, this.canvas.height)

            .enable(wgl.DEPTH_TEST)
            .enable(wgl.CULL_FACE)

            .useProgram(this.boxProgram)

            .vertexAttribPointer(this.cubeVertexBuffer, this.boxProgram.getAttribLocation('a_cubeVertexPosition'), 3, wgl.FLOAT, wgl.FALSE, 0, 0)

            .bindIndexBuffer(this.cubeIndexBuffer)

            .uniformMatrix4fv('u_projectionMatrix', false, this.projectionMatrix)
            .uniformMatrix4fv('u_viewMatrix', false, this.camera.getViewMatrix())

            .enable(wgl.POLYGON_OFFSET_FILL)
            .polygonOffset(1, 1);


        var boxToHighlight = null,
            sideToHighlight = null,
            highlightColor = null;

        if (this.interactionState !== null) {
            if (this.interactionState.mode === InteractionMode.RESIZING || this.interactionState.mode === InteractionMode.EXTRUDING) {
                boxToHighlight = this.interactionState.box;
                sideToHighlight = [1.5, 1.5, 1.5];
                sideToHighlight[this.interactionState.axis] = this.interactionState.side;

                highlightColor = [0.75, 0.75, 0.75];
            }
        } else if (!this.keyPressed[32] && !this.camera.isMouseDown()) { //if we're not interacting with anything and we're not in camera mode
            var mouseRay = this.getMouseRay();

            var boxIntersection = this.getBoxIntersection(mouseRay.origin, mouseRay.direction);

            //if we're over a box, let's highlight the side we're hovering over

            if (boxIntersection !== null) {
                boxToHighlight = boxIntersection.aabb;
                sideToHighlight = [1.5, 1.5, 1.5];
                sideToHighlight[boxIntersection.axis] = boxIntersection.side;

                highlightColor = [0.9, 0.9, 0.9];
            }


            //if we're not over a box but hovering over a bounding plane, let's draw a indicator point
            if (boxIntersection === null && !this.keyPressed[32]) {
                var planeIntersection = this.getBoundingPlaneIntersection(mouseRay.origin, mouseRay.direction);

                if (planeIntersection !== null) {
                    var pointPosition = planeIntersection.point;
                    quantizeVector(pointPosition, STEP);

                    var rotation = [
                        new Float32Array([0, 0, 1, 0, 1, 0, 1, 0, 0]),
                        new Float32Array([1, 0, 0, 0, 0, 1, 0, 1, 0]),
                        new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
                    ][planeIntersection.axis];

                    var pointDrawState = wgl.createDrawState()
                        .bindFramebuffer(null)
                        .viewport(0, 0, this.canvas.width, this.canvas.height)

                        .enable(wgl.DEPTH_TEST)

                        .useProgram(this.pointProgram)

                        .vertexAttribPointer(this.pointVertexBuffer, this.pointProgram.getAttribLocation('a_position'), 3, wgl.FLOAT, wgl.FALSE, 0, 0)

                        .uniformMatrix4fv('u_projectionMatrix', false, this.projectionMatrix)
                        .uniformMatrix4fv('u_viewMatrix', false, this.camera.getViewMatrix())

                        .uniform3f('u_position', pointPosition[0], pointPosition[1], pointPosition[2])

                        .uniformMatrix3fv('u_rotation', false, rotation);

                    wgl.drawArrays(pointDrawState, wgl.TRIANGLE_STRIP, 0, 4);
                }
            }
        }
        
        for (var i = 0; i < this.boxes.length; ++i) {
            var box = this.boxes[i];

            boxDrawState.uniform3f('u_translation', box.min[0], box.min[1], box.min[2])
                .uniform3f('u_scale', box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]);

            if (box === boxToHighlight) {
                boxDrawState.uniform3f('u_highlightSide', sideToHighlight[0], sideToHighlight[1], sideToHighlight[2]);
                boxDrawState.uniform3f('u_highlightColor', highlightColor[0], highlightColor[1], highlightColor[2]);
            } else {
                boxDrawState.uniform3f('u_highlightSide', 1.5, 1.5, 1.5);
            }

            wgl.drawElements(boxDrawState, wgl.TRIANGLES, 36, wgl.UNSIGNED_SHORT);
        }



        var boxWireframeDrawState = wgl.createDrawState()
            .bindFramebuffer(null)
            .viewport(0, 0, this.canvas.width, this.canvas.height)

            .enable(wgl.DEPTH_TEST)

            .useProgram(this.boxWireframeProgram)

            .vertexAttribPointer(this.cubeWireframeVertexBuffer, this.boxWireframeProgram.getAttribLocation('a_cubeVertexPosition'), 3, wgl.FLOAT, wgl.FALSE, 0, 0)

            .bindIndexBuffer(this.cubeWireframeIndexBuffer)

            .uniformMatrix4fv('u_projectionMatrix', false, this.projectionMatrix)
            .uniformMatrix4fv('u_viewMatrix', false, this.camera.getViewMatrix())

        
        for (var i = 0; i < this.boxes.length; ++i) {
            var box = this.boxes[i];

            boxWireframeDrawState.uniform3f('u_translation', box.min[0], box.min[1], box.min[2])
                .uniform3f('u_scale', box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]);

            wgl.drawElements(boxWireframeDrawState, wgl.LINES, 24, wgl.UNSIGNED_SHORT);
        }


    }

    return {
        BoxEditor: BoxEditor,
        AABB: AABB,
        InteractionMode: InteractionMode
    };
}());
