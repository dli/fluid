'use strict'

var Simulator = (function () {

    //simulation grid dimensions and resolution
    //all particles are in the world position space ([0, 0, 0], [GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH])

    //when doing most grid operations, we transform positions from world position space into the grid position space ([0, 0, 0], [GRID_RESOLUTION_X, GRID_RESOLUTION_Y, GRID_RESOLUTION_Z])


    //in grid space, cell boundaries are simply at integer values

    //we emulate 3D textures with tiled 2d textures
    //so the z slices of a 3d texture are laid out along the x axis
    //the 2d dimensions of a 3d texture are therefore [width * depth, height]


    /*
    we use a staggered MAC grid
    this means the velocity grid width = grid width + 1 and velocity grid height = grid height + 1 and velocity grid depth = grid depth + 1
    a scalar for cell [i, j, k] is positionally located at [i + 0.5, j + 0.5, k + 0.5]
    x velocity for cell [i, j, k] is positionally located at [i, j + 0.5, k + 0.5]
    y velocity for cell [i, j, k] is positionally located at [i + 0.5, j, k + 0.5]
    z velocity for cell [i, j, k] is positionally located at [i + 0.5, j + 0.5, k]
    */

    //the boundaries are the boundaries of the grid 
    //a grid cell can either be fluid, air (these are tracked by markTexture) or is a wall (implicit by position)

    function Simulator (wgl, onLoaded) {
        this.wgl = wgl;

        this.particlesWidth = 0;
        this.particlesHeight = 0;
        
        this.gridWidth = 0;
        this.gridHeight = 0;
        this.gridDepth = 0;

        this.gridResolutionX = 0;
        this.gridResolutionY = 0;
        this.gridResolutionZ = 0;

        this.particleDensity = 0;

        this.velocityTextureWidth = 0;
        this.velocityTextureHeight = 0;

        this.scalarTextureWidth = 0;
        this.scalarTextureHeight = 0;

        
        this.halfFloatExt = this.wgl.getExtension('OES_texture_half_float');
        this.wgl.getExtension('OES_texture_half_float_linear');

        this.simulationNumberType = this.halfFloatExt.HALF_FLOAT_OES;


        ///////////////////////////////////////////////////////
        // simulation parameters

        this.flipness = 0.99; //0 is full PIC, 1 is full FLIP


        this.frameNumber = 0; //used for motion randomness

        
        /////////////////////////////////////////////////
        // simulation objects (most are filled in by reset)

        this.quadVertexBuffer = wgl.createBuffer();
        wgl.bufferData(this.quadVertexBuffer, wgl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]), wgl.STATIC_DRAW);

        this.simulationFramebuffer = wgl.createFramebuffer();
        this.particleVertexBuffer = wgl.createBuffer();


        this.particlePositionTexture = wgl.createTexture();
        this.particlePositionTextureTemp = wgl.createTexture();


        this.particleVelocityTexture = wgl.createTexture();
        this.particleVelocityTextureTemp = wgl.createTexture();

        this.particleRandomTexture = wgl.createTexture(); //contains a random normalized direction for each particle



        ////////////////////////////////////////////////////
        // create simulation textures

        this.velocityTexture = wgl.createTexture();
        this.tempVelocityTexture = wgl.createTexture();
        this.originalVelocityTexture = wgl.createTexture();
        this.weightTexture = wgl.createTexture();

        this.markerTexture = wgl.createTexture(); //marks fluid/air, 1 if fluid, 0 if air
        this.divergenceTexture = wgl.createTexture();
        this.pressureTexture = wgl.createTexture();
        this.tempSimulationTexture = wgl.createTexture();



        /////////////////////////////
        // load programs


        wgl.createProgramsFromFiles({
            transferToGridProgram: {
                vertexShader: 'shaders/transfertogrid.vert',
                fragmentShader: ['shaders/common.frag', 'shaders/transfertogrid.frag'],
                attributeLocations: { 'a_textureCoordinates': 0}
            },
            normalizeGridProgram: {
                vertexShader: 'shaders/fullscreen.vert',
                fragmentShader: 'shaders/normalizegrid.frag',
                attributeLocations: { 'a_position': 0}
            },
            markProgram: {
                vertexShader: 'shaders/mark.vert',
                fragmentShader: 'shaders/mark.frag',
                attributeLocations: { 'a_textureCoordinates': 0}
            },
            addForceProgram: {
                vertexShader: 'shaders/fullscreen.vert',
                fragmentShader: ['shaders/common.frag', 'shaders/addforce.frag'],
                attributeLocations: { 'a_position': 0}
            },
            enforceBoundariesProgram: {
                vertexShader: 'shaders/fullscreen.vert',
                fragmentShader: ['shaders/common.frag', 'shaders/enforceboundaries.frag'],
                attributeLocations: { 'a_textureCoordinates': 0 }
            },
            extendVelocityProgram: {
                vertexShader: 'shaders/fullscreen.vert',
                fragmentShader: 'shaders/extendvelocity.frag',
                attributeLocations: { 'a_textureCoordinates': 0 }
            },
            transferToParticlesProgram: {
                vertexShader: 'shaders/fullscreen.vert',
                fragmentShader: ['shaders/common.frag', 'shaders/transfertoparticles.frag'],
                attributeLocations: { 'a_position': 0}
            },
            divergenceProgram: {
                vertexShader: 'shaders/fullscreen.vert',
                fragmentShader: ['shaders/common.frag', 'shaders/divergence.frag'],
                attributeLocations: { 'a_position': 0}
            },
            jacobiProgram: {
                vertexShader: 'shaders/fullscreen.vert',
                fragmentShader: ['shaders/common.frag', 'shaders/jacobi.frag'],
                attributeLocations: { 'a_position': 0}
            },
            subtractProgram: {
                vertexShader: 'shaders/fullscreen.vert',
                fragmentShader: ['shaders/common.frag', 'shaders/subtract.frag'],
                attributeLocations: { 'a_position': 0}
            },
            advectProgram: {
                vertexShader: 'shaders/fullscreen.vert',
                fragmentShader: ['shaders/common.frag', 'shaders/advect.frag'],
                attributeLocations: { 'a_position': 0}
            },
            copyProgram: {
                vertexShader: 'shaders/fullscreen.vert',
                fragmentShader: 'shaders/copy.frag',
                attributeLocations: { 'a_position': 0}
            }
        }, (function (programs) {
            for (var programName in programs) {
                this[programName] = programs[programName];
            }

            onLoaded();
        }).bind(this));
    }


    //expects an array of [x, y, z] particle positions
    //gridSize and gridResolution are both [x, y, z]

    //particleDensity is particles per simulation grid cell
    Simulator.prototype.reset = function (particlesWidth, particlesHeight, particlePositions, gridSize, gridResolution, particleDensity) {

        this.particlesWidth = particlesWidth;
        this.particlesHeight = particlesHeight;

        this.gridWidth = gridSize[0];
        this.gridHeight = gridSize[1];
        this.gridDepth = gridSize[2];

        this.gridResolutionX = gridResolution[0];
        this.gridResolutionY = gridResolution[1];
        this.gridResolutionZ = gridResolution[2];

        this.particleDensity = particleDensity;

        this.velocityTextureWidth = (this.gridResolutionX + 1) * (this.gridResolutionZ + 1);
        this.velocityTextureHeight = (this.gridResolutionY + 1);

        this.scalarTextureWidth = this.gridResolutionX * this.gridResolutionZ;
        this.scalarTextureHeight = this.gridResolutionY;



        ///////////////////////////////////////////////////////////
        // create particle data
        
        var particleCount = this.particlesWidth * this.particlesHeight;

        //fill particle vertex buffer containing the relevant texture coordinates
        var particleTextureCoordinates = new Float32Array(this.particlesWidth * this.particlesHeight * 2);
        for (var y = 0; y < this.particlesHeight; ++y) {
            for (var x = 0; x < this.particlesWidth; ++x) {
                particleTextureCoordinates[(y * this.particlesWidth + x) * 2] = (x + 0.5) / this.particlesWidth;
                particleTextureCoordinates[(y * this.particlesWidth + x) * 2 + 1] = (y + 0.5) / this.particlesHeight;
            }
        }

        wgl.bufferData(this.particleVertexBuffer, wgl.ARRAY_BUFFER, particleTextureCoordinates, wgl.STATIC_DRAW);

        //generate initial particle positions amd create particle position texture for them
        var particlePositionsData = new Float32Array(this.particlesWidth * this.particlesHeight * 4);
        var particleRandoms = new Float32Array(this.particlesWidth * this.particlesHeight * 4);
        for (var i = 0; i < this.particlesWidth * this.particlesHeight; ++i) {
            particlePositionsData[i * 4] = particlePositions[i][0];
            particlePositionsData[i * 4 + 1] = particlePositions[i][1];
            particlePositionsData[i * 4 + 2] = particlePositions[i][2];
            particlePositionsData[i * 4 + 3] = 0.0;

            var theta = Math.random() * 2.0 * Math.PI;
            var u = Math.random() * 2.0 - 1.0;
            particleRandoms[i * 4] = Math.sqrt(1.0 - u * u) * Math.cos(theta);
            particleRandoms[i * 4 + 1] = Math.sqrt(1.0 - u * u) * Math.sin(theta);
            particleRandoms[i * 4 + 2] = u;
            particleRandoms[i * 4 + 3] = 0.0;
        }

        wgl.rebuildTexture(this.particlePositionTexture, wgl.RGBA, wgl.FLOAT, this.particlesWidth, this.particlesHeight, particlePositionsData, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.NEAREST, wgl.NEAREST);
        wgl.rebuildTexture(this.particlePositionTextureTemp, wgl.RGBA, wgl.FLOAT, this.particlesWidth, this.particlesHeight, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.NEAREST, wgl.NEAREST);


        wgl.rebuildTexture(this.particleVelocityTexture, wgl.RGBA, this.simulationNumberType, this.particlesWidth, this.particlesHeight, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.NEAREST, wgl.NEAREST);
        wgl.rebuildTexture(this.particleVelocityTextureTemp, wgl.RGBA, this.simulationNumberType, this.particlesWidth, this.particlesHeight, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.NEAREST, wgl.NEAREST);

        wgl.rebuildTexture(this.particleRandomTexture, wgl.RGBA, wgl.FLOAT, this.particlesWidth, this.particlesHeight, particleRandoms, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.NEAREST, wgl.NEAREST); //contains a random normalized direction for each particle



        ////////////////////////////////////////////////////
        // create simulation textures

        wgl.rebuildTexture(this.velocityTexture, wgl.RGBA, this.simulationNumberType, this.velocityTextureWidth, this.velocityTextureHeight, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.LINEAR, wgl.LINEAR);
        wgl.rebuildTexture(this.tempVelocityTexture, wgl.RGBA, this.simulationNumberType, this.velocityTextureWidth, this.velocityTextureHeight, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.LINEAR, wgl.LINEAR);
        wgl.rebuildTexture(this.originalVelocityTexture, wgl.RGBA, this.simulationNumberType, this.velocityTextureWidth, this.velocityTextureHeight, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.LINEAR, wgl.LINEAR);
        wgl.rebuildTexture(this.weightTexture, wgl.RGBA, this.simulationNumberType, this.velocityTextureWidth, this.velocityTextureHeight, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.LINEAR, wgl.LINEAR);

        wgl.rebuildTexture(this.markerTexture, wgl.RGBA, wgl.UNSIGNED_BYTE, this.scalarTextureWidth, this.scalarTextureHeight, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.LINEAR, wgl.LINEAR); //marks fluid/air, 1 if fluid, 0 if air
        wgl.rebuildTexture(this.divergenceTexture, wgl.RGBA, this.simulationNumberType, this.scalarTextureWidth, this.scalarTextureHeight, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.LINEAR, wgl.LINEAR);
        wgl.rebuildTexture(this.pressureTexture, wgl.RGBA, this.simulationNumberType, this.scalarTextureWidth, this.scalarTextureHeight, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.LINEAR, wgl.LINEAR);
        wgl.rebuildTexture(this.tempSimulationTexture, wgl.RGBA, this.simulationNumberType, this.scalarTextureWidth, this.scalarTextureHeight, null, wgl.CLAMP_TO_EDGE, wgl.CLAMP_TO_EDGE, wgl.LINEAR, wgl.LINEAR);


    }

    function swap (object, a, b) {
        var temp = object[a];
        object[a] = object[b];
        object[b] = temp;
    }

    //you need to call reset() with correct parameters before simulating
    //mouseVelocity, mouseRayOrigin, mouseRayDirection are all expected to be arrays of 3 values
    Simulator.prototype.simulate = function (timeStep, mouseVelocity, mouseRayOrigin, mouseRayDirection) {
        if (timeStep === 0.0) return;

        this.frameNumber += 1;

        var wgl = this.wgl;

        /*
            the simulation process
            transfer particle velocities to velocity grid
            save this velocity grid

            solve velocity grid for non divergence

            update particle velocities with new velocity grid
            advect particles through the grid velocity field
        */


        //////////////////////////////////////////////////////
        //transfer particle velocities to grid

        //we transfer particle velocities to the grid in two steps
        //in the first step, we accumulate weight * velocity into tempVelocityTexture and then weight into weightTexture
        //in the second step: velocityTexture = tempVelocityTexture / weightTexture

        //we accumulate into velocityWeightTexture and then divide into velocityTexture

        var transferToGridDrawState = wgl.createDrawState()
            .bindFramebuffer(this.simulationFramebuffer)
            .viewport(0, 0, this.velocityTextureWidth, this.velocityTextureHeight)

            .vertexAttribPointer(this.particleVertexBuffer, 0, 2, wgl.FLOAT, wgl.FALSE, 0, 0)

            .useProgram(this.transferToGridProgram)
            .uniform3f('u_gridResolution', this.gridResolutionX, this.gridResolutionY, this.gridResolutionZ)
            .uniform3f('u_gridSize', this.gridWidth, this.gridHeight, this.gridDepth)
            .uniformTexture('u_positionTexture', 0, wgl.TEXTURE_2D, this.particlePositionTexture)
            .uniformTexture('u_velocityTexture', 1, wgl.TEXTURE_2D, this.particleVelocityTexture)

            .enable(wgl.BLEND)
            .blendEquation(wgl.FUNC_ADD)
            .blendFuncSeparate(wgl.ONE, wgl.ONE, wgl.ONE, wgl.ONE);


        //accumulate weight
        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.weightTexture, 0);

        wgl.clear(
            wgl.createClearState().bindFramebuffer(this.simulationFramebuffer).clearColor(0, 0, 0, 0),
            wgl.COLOR_BUFFER_BIT);

        transferToGridDrawState.uniform1i('u_accumulate', 0)

        //each particle gets splatted layer by layer from z - (SPLAT_SIZE - 1) / 2 to z + (SPLAT_SIZE - 1) / 2
        var SPLAT_DEPTH = 5;

        for (var z = -(SPLAT_DEPTH - 1) / 2; z <= (SPLAT_DEPTH - 1) / 2; ++z) {
            transferToGridDrawState.uniform1f('u_zOffset', z);
            wgl.drawArrays(transferToGridDrawState, wgl.POINTS, 0, this.particlesWidth * this.particlesHeight);
        }

        //accumulate (weight * velocity)
        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.tempVelocityTexture, 0);
        wgl.clear(
            wgl.createClearState().bindFramebuffer(this.simulationFramebuffer),
            wgl.COLOR_BUFFER_BIT);

        transferToGridDrawState.uniform1i('u_accumulate', 1)

        for (var z = -(SPLAT_DEPTH - 1) / 2; z <= (SPLAT_DEPTH - 1) / 2; ++z) {
            transferToGridDrawState.uniform1f('u_zOffset', z);
            wgl.drawArrays(transferToGridDrawState, wgl.POINTS, 0, this.particlesWidth * this.particlesHeight);
        }


        //in the second step, we divide sum(weight * velocity) by sum(weight) (the two accumulated quantities from before)

        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.velocityTexture, 0);

        var normalizeDrawState = wgl.createDrawState()
            .bindFramebuffer(this.simulationFramebuffer)
            .viewport(0, 0, this.velocityTextureWidth, this.velocityTextureHeight)

            .vertexAttribPointer(this.quadVertexBuffer, 0, 2, wgl.FLOAT, wgl.FALSE, 0, 0)

            .useProgram(this.normalizeGridProgram)
            .uniformTexture('u_weightTexture', 0, wgl.TEXTURE_2D, this.weightTexture)
            .uniformTexture('u_accumulatedVelocityTexture', 1, wgl.TEXTURE_2D, this.tempVelocityTexture)

        wgl.drawArrays(normalizeDrawState, wgl.TRIANGLE_STRIP, 0, 4);


        //////////////////////////////////////////////////////
        // mark cells with fluid

        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.markerTexture, 0);
        wgl.clear(
            wgl.createClearState().bindFramebuffer(this.simulationFramebuffer),
            wgl.COLOR_BUFFER_BIT);

        var markDrawState = wgl.createDrawState()
            .bindFramebuffer(this.simulationFramebuffer)
            .viewport(0, 0, this.scalarTextureWidth, this.scalarTextureHeight)

            .vertexAttribPointer(this.particleVertexBuffer, 0, 2, wgl.FLOAT, wgl.FALSE, 0, 0)

            .useProgram(this.markProgram)
            .uniform3f('u_gridResolution', this.gridResolutionX, this.gridResolutionY, this.gridResolutionZ)
            .uniform3f('u_gridSize', this.gridWidth, this.gridHeight, this.gridDepth)
            .uniformTexture('u_positionTexture', 0, wgl.TEXTURE_2D, this.particlePositionTexture);

        wgl.drawArrays(markDrawState, wgl.POINTS, 0, this.particlesWidth * this.particlesHeight);

        ////////////////////////////////////////////////////
        // save our original velocity grid

        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.originalVelocityTexture, 0);

        var copyDrawState = wgl.createDrawState()
            .bindFramebuffer(this.simulationFramebuffer)
            .viewport(0, 0, this.velocityTextureWidth, this.velocityTextureHeight)

            .vertexAttribPointer(this.quadVertexBuffer, 0, 2, wgl.FLOAT, wgl.FALSE, 0, 0)

            .useProgram(this.copyProgram)
            .uniformTexture('u_texture', 0, wgl.TEXTURE_2D, this.velocityTexture)

        wgl.drawArrays(copyDrawState, wgl.TRIANGLE_STRIP, 0, 4);


        /////////////////////////////////////////////////////
        // add forces to velocity grid


        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.tempVelocityTexture, 0);

        var addForceDrawState = wgl.createDrawState()
            .bindFramebuffer(this.simulationFramebuffer)
            .viewport(0, 0, this.velocityTextureWidth, this.velocityTextureHeight)

            .vertexAttribPointer(this.quadVertexBuffer, 0, 2, wgl.FLOAT, wgl.FALSE, 0, 0)

            .useProgram(this.addForceProgram)
            .uniformTexture('u_velocityTexture', 0, wgl.TEXTURE_2D, this.velocityTexture)

            .uniform1f('u_timeStep', timeStep)

            .uniform3f('u_mouseVelocity', mouseVelocity[0], mouseVelocity[1], mouseVelocity[2])

            .uniform3f('u_gridResolution', this.gridResolutionX, this.gridResolutionY, this.gridResolutionZ)
            .uniform3f('u_gridSize', this.gridWidth, this.gridHeight, this.gridDepth)

            .uniform3f('u_mouseRayOrigin', mouseRayOrigin[0], mouseRayOrigin[1], mouseRayOrigin[2])
            .uniform3f('u_mouseRayDirection', mouseRayDirection[0], mouseRayDirection[1], mouseRayDirection[2])


        wgl.drawArrays(addForceDrawState, wgl.TRIANGLE_STRIP, 0, 4);

        swap(this, 'velocityTexture', 'tempVelocityTexture');

        
        /////////////////////////////////////////////////////
        // enforce boundary velocity conditions

        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.tempVelocityTexture, 0);

        var enforceBoundariesDrawState = wgl.createDrawState()
            .bindFramebuffer(this.simulationFramebuffer)
            .viewport(0, 0, this.velocityTextureWidth, this.velocityTextureHeight)

            .vertexAttribPointer(this.quadVertexBuffer, 0, 2, wgl.FLOAT, wgl.FALSE, 0, 0)

            .useProgram(this.enforceBoundariesProgram)
            .uniformTexture('u_velocityTexture', 0, wgl.TEXTURE_2D, this.velocityTexture)
            .uniform3f('u_gridResolution', this.gridResolutionX, this.gridResolutionY, this.gridResolutionZ);

        wgl.drawArrays(enforceBoundariesDrawState, wgl.TRIANGLE_STRIP, 0, 4);

        swap(this, 'velocityTexture', 'tempVelocityTexture');


        /////////////////////////////////////////////////////
        // update velocityTexture for non divergence


         //compute divergence for pressure projection

        var divergenceDrawState = wgl.createDrawState()
            
            .bindFramebuffer(this.simulationFramebuffer)
            .viewport(0, 0, this.scalarTextureWidth, this.scalarTextureHeight)

            .useProgram(this.divergenceProgram)
            .uniform3f('u_gridResolution', this.gridResolutionX, this.gridResolutionY, this.gridResolutionZ)
            .uniformTexture('u_velocityTexture', 0, wgl.TEXTURE_2D, this.velocityTexture)
            .uniformTexture('u_markerTexture', 1, wgl.TEXTURE_2D, this.markerTexture)
            .uniformTexture('u_weightTexture', 2, wgl.TEXTURE_2D, this.weightTexture)

            .uniform1f('u_maxDensity', this.particleDensity)

            .vertexAttribPointer(this.quadVertexBuffer, 0, 2, wgl.FLOAT, false, 0, 0)

        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.divergenceTexture, 0);
        wgl.clear(
            wgl.createClearState().bindFramebuffer(this.simulationFramebuffer),
            wgl.COLOR_BUFFER_BIT);
        
        wgl.drawArrays(divergenceDrawState, wgl.TRIANGLE_STRIP, 0, 4);
        
        
        //compute pressure via jacobi iteration

        var jacobiDrawState = wgl.createDrawState()
            .bindFramebuffer(this.simulationFramebuffer)
            .viewport(0, 0, this.scalarTextureWidth, this.scalarTextureHeight)

            .useProgram(this.jacobiProgram)
            .uniform3f('u_gridResolution', this.gridResolutionX, this.gridResolutionY, this.gridResolutionZ)
            .uniformTexture('u_divergenceTexture', 1, wgl.TEXTURE_2D, this.divergenceTexture)
            .uniformTexture('u_markerTexture', 2, wgl.TEXTURE_2D, this.markerTexture)

            .vertexAttribPointer(this.quadVertexBuffer, 0, 2, wgl.FLOAT, false, 0, 0)


        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.pressureTexture, 0);
        wgl.clear(
            wgl.createClearState().bindFramebuffer(this.simulationFramebuffer),
            wgl.COLOR_BUFFER_BIT);
        
        var PRESSURE_JACOBI_ITERATIONS = 50;
        for (var i = 0; i < PRESSURE_JACOBI_ITERATIONS; ++i) {
            wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.tempSimulationTexture, 0);
            jacobiDrawState.uniformTexture('u_pressureTexture', 0, wgl.TEXTURE_2D, this.pressureTexture);
            
            wgl.drawArrays(jacobiDrawState, wgl.TRIANGLE_STRIP, 0, 4);
            
            swap(this, 'pressureTexture', 'tempSimulationTexture');
        }
        
        
        //subtract pressure gradient from velocity

        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.tempVelocityTexture, 0);

        var subtractDrawState = wgl.createDrawState()
            .bindFramebuffer(this.simulationFramebuffer)
            .viewport(0, 0, this.velocityTextureWidth, this.velocityTextureHeight)

            .useProgram(this.subtractProgram)
            .uniform3f('u_gridResolution', this.gridResolutionX, this.gridResolutionY, this.gridResolutionZ)
            .uniformTexture('u_pressureTexture', 0, wgl.TEXTURE_2D, this.pressureTexture)
            .uniformTexture('u_velocityTexture', 1, wgl.TEXTURE_2D, this.velocityTexture)
            .uniformTexture('u_markerTexture', 2, wgl.TEXTURE_2D, this.markerTexture)

            .vertexAttribPointer(this.quadVertexBuffer, 0, 2, wgl.FLOAT, false, 0, 0)
        
        wgl.drawArrays(subtractDrawState, wgl.TRIANGLE_STRIP, 0, 4);
        
        swap(this, 'velocityTexture', 'tempVelocityTexture');

        /////////////////////////////////////////////////////////////
        // transfer velocities back to particles

        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.particleVelocityTextureTemp, 0);

        var transferToParticlesDrawState = wgl.createDrawState()
            .bindFramebuffer(this.simulationFramebuffer)
            .viewport(0, 0, this.particlesWidth, this.particlesHeight)

            .vertexAttribPointer(this.quadVertexBuffer, 0, 2, wgl.FLOAT, wgl.FALSE, 0, 0)

            .useProgram(this.transferToParticlesProgram)
            .uniformTexture('u_particlePositionTexture', 0, wgl.TEXTURE_2D, this.particlePositionTexture)
            .uniformTexture('u_particleVelocityTexture', 1, wgl.TEXTURE_2D, this.particleVelocityTexture)
            .uniformTexture('u_gridVelocityTexture', 2, wgl.TEXTURE_2D, this.velocityTexture)
            .uniformTexture('u_originalGridVelocityTexture', 3, wgl.TEXTURE_2D, this.originalVelocityTexture)
            .uniform3f('u_gridResolution', this.gridResolutionX, this.gridResolutionY, this.gridResolutionZ)
            .uniform3f('u_gridSize', this.gridWidth, this.gridHeight, this.gridDepth)

            .uniform1f('u_flipness', this.flipness)

        wgl.drawArrays(transferToParticlesDrawState, wgl.TRIANGLE_STRIP, 0, 4);

        swap(this, 'particleVelocityTextureTemp', 'particleVelocityTexture');

        ///////////////////////////////////////////////
        // advect particle positions with velocity grid using RK2


        wgl.framebufferTexture2D(this.simulationFramebuffer, wgl.FRAMEBUFFER, wgl.COLOR_ATTACHMENT0, wgl.TEXTURE_2D, this.particlePositionTextureTemp, 0);
        wgl.clear(
            wgl.createClearState().bindFramebuffer(this.simulationFramebuffer),
            wgl.COLOR_BUFFER_BIT);

        var advectDrawState = wgl.createDrawState()
            .bindFramebuffer(this.simulationFramebuffer)
            .viewport(0, 0, this.particlesWidth, this.particlesHeight)

            .vertexAttribPointer(this.quadVertexBuffer, 0, 2, wgl.FLOAT, wgl.FALSE, 0, 0)

            .useProgram(this.advectProgram)
            .uniformTexture('u_positionsTexture', 0, wgl.TEXTURE_2D, this.particlePositionTexture)
            .uniformTexture('u_randomsTexture', 1, wgl.TEXTURE_2D, this.particleRandomTexture)
            .uniformTexture('u_velocityGrid', 2, wgl.TEXTURE_2D, this.velocityTexture)
            .uniform3f('u_gridResolution', this.gridResolutionX, this.gridResolutionY, this.gridResolutionZ)
            .uniform3f('u_gridSize', this.gridWidth, this.gridHeight, this.gridDepth)
            .uniform1f('u_timeStep', timeStep)
            .uniform1f('u_frameNumber', this.frameNumber)
            .uniform2f('u_particlesResolution', this.particlesWidth, this.particlesHeight);

        wgl.drawArrays(advectDrawState, wgl.TRIANGLE_STRIP, 0, 4);

        swap(this, 'particlePositionTextureTemp', 'particlePositionTexture');
    }

    return Simulator;
}());
