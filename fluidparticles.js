'use strict'

var FluidParticles = (function () {
    var FOV = Math.PI / 3;

    var State = {
        EDITING: 0,
        SIMULATING: 1
    };

    var GRID_WIDTH = 40,
        GRID_HEIGHT = 20,
        GRID_DEPTH = 20;

    var PARTICLES_PER_CELL = 10;

    function FluidParticles () {

        var canvas = this.canvas = document.getElementById('canvas');
        var wgl = this.wgl = new WrappedGL(canvas);

        window.wgl = wgl;

        this.projectionMatrix = Utilities.makePerspectiveMatrix(new Float32Array(16), FOV, this.canvas.width / this.canvas.height, 0.1, 100.0);
        this.camera = new Camera(this.canvas, [GRID_WIDTH / 2, GRID_HEIGHT / 3, GRID_DEPTH / 2]);

        var boxEditorLoaded = false,
            simulatorRendererLoaded = false;

        this.boxEditor = new BoxEditor.BoxEditor(this.canvas, this.wgl, this.projectionMatrix, this.camera, [GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH], (function () {
            boxEditorLoaded = true;
            if (boxEditorLoaded && simulatorRendererLoaded) {
                start.call(this);
            }
        }).bind(this),
        (function () {
            this.redrawUI(); 
        }).bind(this));

        this.simulatorRenderer = new SimulatorRenderer(this.canvas, this.wgl, this.projectionMatrix, this.camera, [GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH], (function () {
            simulatorRendererLoaded = true;
            if (boxEditorLoaded && simulatorRendererLoaded) {
                start.call(this);
            }
        }).bind(this));

        function start(programs) {
            this.state = State.EDITING;

            this.startButton = document.getElementById('start-button');

            this.startButton.addEventListener('click', (function () {
                if (this.state === State.EDITING) {
                    if (this.boxEditor.boxes.length > 0) {
                        this.startSimulation();
                    }
                    this.redrawUI();
                } else if (this.state === State.SIMULATING) {
                    this.stopSimulation();
                    this.redrawUI();
                }
            }).bind(this));

            this.currentPresetIndex = 0;
            this.editedSinceLastPreset = false; //whether the user has edited the last set preset
            var PRESETS = [
                //dam break
                [
                    new BoxEditor.AABB([0, 0, 0], [15, 20, 20]) 
                ],

                //block drop
                [
                    new BoxEditor.AABB([0, 0, 0], [40, 7, 20]),
                    new BoxEditor.AABB([12, 12, 5], [28, 20, 15]) 
                ],

                //double splash
                [
                    new BoxEditor.AABB([0, 0, 0], [10, 20, 15]),
                    new BoxEditor.AABB([30, 0, 5], [40, 20, 20]) 
                ],

            ];
            
            this.presetButton = document.getElementById('preset-button');
            this.presetButton.addEventListener('click', (function () {
                this.editedSinceLastPreset = false;

                this.boxEditor.boxes.length = 0;

                var preset = PRESETS[this.currentPresetIndex];
                for (var i = 0; i < preset.length; ++i) {
                    this.boxEditor.boxes.push(preset[i].clone());
                }

                this.currentPresetIndex = (this.currentPresetIndex + 1) % PRESETS.length; 

                this.redrawUI();

            }).bind(this));



            ////////////////////////////////////////////////////////
            // parameters/sliders

            //using gridCellDensity ensures a linear relationship to particle count
            this.gridCellDensity = 0.5; //simulation grid cell density per world space unit volume

            this.timeStep = 1.0 / 60.0;

            this.densitySlider = new Slider(document.getElementById('density-slider'), this.gridCellDensity, 0.2, 3.0, (function (value) {
                this.gridCellDensity = value; 

                this.redrawUI();
            }).bind(this));

            this.flipnessSlider = new Slider(document.getElementById('fluidity-slider'), this.simulatorRenderer.simulator.flipness, 0.5, 0.99, (function (value) {
                this.simulatorRenderer.simulator.flipness = value;
            }).bind(this));

            this.speedSlider = new Slider(document.getElementById('speed-slider'), this.timeStep, 0.0, 1.0 / 60.0, (function (value) {
                this.timeStep = value;
            }).bind(this));


            this.redrawUI();


            this.presetButton.click();

            ///////////////////////////////////////////////////////
            // interaction state stuff

            canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
            canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
            document.addEventListener('mouseup', this.onMouseUp.bind(this));

            document.addEventListener('keydown', this.onKeyDown.bind(this));
            document.addEventListener('keyup', this.onKeyUp.bind(this));

            window.addEventListener('resize', this.onResize.bind(this));
            this.onResize();


            ////////////////////////////////////////////////////
            // start the update loop

            var lastTime = 0;
            var update = (function (currentTime) {
                var deltaTime = currentTime - lastTime || 0;
                lastTime = currentTime;

                this.update(deltaTime);

                requestAnimationFrame(update);
            }).bind(this);
            update();


        }
    }

    FluidParticles.prototype.onResize = function (event) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        Utilities.makePerspectiveMatrix(this.projectionMatrix, FOV, this.canvas.width / this.canvas.height, 0.1, 100.0);

        this.simulatorRenderer.onResize(event);
    }

    FluidParticles.prototype.onMouseMove = function (event) {
        event.preventDefault();

        if (this.state === State.EDITING) {
            this.boxEditor.onMouseMove(event);

            if (this.boxEditor.interactionState !== null) {
                this.editedSinceLastPreset = true;
            }
        } else if (this.state === State.SIMULATING) {
            this.simulatorRenderer.onMouseMove(event);
        }
    };

    FluidParticles.prototype.onMouseDown = function (event) {
        event.preventDefault();

        if (this.state === State.EDITING) {
            this.boxEditor.onMouseDown(event);
        } else if (this.state === State.SIMULATING) {
            this.simulatorRenderer.onMouseDown(event);
        }
    };

    FluidParticles.prototype.onMouseUp = function (event) {
        event.preventDefault();

        if (this.state === State.EDITING) {
            this.boxEditor.onMouseUp(event);
        } else if (this.state === State.SIMULATING) {
            this.simulatorRenderer.onMouseUp(event);
        }
    };

    FluidParticles.prototype.onKeyDown = function (event) {
        if (this.state === State.EDITING) {
            this.boxEditor.onKeyDown(event);
        }
    };

    FluidParticles.prototype.onKeyUp = function (event) {
        if (this.state === State.EDITING) {
            this.boxEditor.onKeyUp(event);
        }
    };

    //the UI elements are all created in the constructor, this just updates the DOM elements
    //should be called every time state changes
    FluidParticles.prototype.redrawUI = function () {

        var simulatingElements = document.querySelectorAll('.simulating-ui');
        var editingElements = document.querySelectorAll('.editing-ui');


        if (this.state === State.SIMULATING) {
            for (var i = 0; i < simulatingElements.length; ++i) {
                simulatingElements[i].style.display = 'block';
            }

            for (var i = 0; i < editingElements.length; ++i) {
                editingElements[i].style.display = 'none';
            }


            this.startButton.textContent = 'Edit';
            this.startButton.className = 'start-button-active';
        } else if (this.state === State.EDITING) {
            for (var i = 0; i < simulatingElements.length; ++i) {
                simulatingElements[i].style.display = 'none';
            }

            for (var i = 0; i < editingElements.length; ++i) {
                editingElements[i].style.display = 'block';
            }

            document.getElementById('particle-count').innerHTML = this.getParticleCount().toFixed(0) + ' particles';

            if (this.boxEditor.boxes.length >= 2 ||
                this.boxEditor.boxes.length === 1 && (this.boxEditor.interactionState === null || this.boxEditor.interactionState.mode !== BoxEditor.InteractionMode.EXTRUDING && this.boxEditor.interactionState.mode !== BoxEditor.InteractionMode.DRAWING)) { 
                this.startButton.className = 'start-button-active';
            } else {
                this.startButton.className = 'start-button-inactive';
            }

            this.startButton.textContent = 'Start';

            if (this.editedSinceLastPreset) {
                this.presetButton.innerHTML = 'Use Preset';
            } else {
                this.presetButton.innerHTML = 'Next Preset';
            }
        }

        this.flipnessSlider.redraw();
        this.densitySlider.redraw();
        this.speedSlider.redraw();
    }


    //compute the number of particles for the current boxes and grid density
    FluidParticles.prototype.getParticleCount = function () {
        var boxEditor = this.boxEditor;

        var gridCells = GRID_WIDTH * GRID_HEIGHT * GRID_DEPTH * this.gridCellDensity;

        //assuming x:y:z ratio of 2:1:1
        var gridResolutionY = Math.ceil(Math.pow(gridCells / 2, 1.0 / 3.0));
        var gridResolutionZ = gridResolutionY * 1;
        var gridResolutionX = gridResolutionY * 2;

        var totalGridCells = gridResolutionX * gridResolutionY * gridResolutionZ;


        var totalVolume = 0;
        var cumulativeVolume = []; //at index i, contains the total volume up to and including box i (so index 0 has volume of first box, last index has total volume)

        for (var i = 0; i < boxEditor.boxes.length; ++i) {
            var box = boxEditor.boxes[i];
            var volume = box.computeVolume();

            totalVolume += volume;
            cumulativeVolume[i] = totalVolume;
        }

        var fractionFilled = totalVolume / (GRID_WIDTH * GRID_HEIGHT * GRID_DEPTH);

        var desiredParticleCount = fractionFilled * totalGridCells * PARTICLES_PER_CELL; //theoretical number of particles

        return desiredParticleCount;
    }

    //begin simulation using boxes from box editor
    //EDITING -> SIMULATING
    FluidParticles.prototype.startSimulation = function () {
        this.state = State.SIMULATING;

        var desiredParticleCount = this.getParticleCount(); //theoretical number of particles
        var particlesWidth = 512; //we fix particlesWidth
        var particlesHeight = Math.ceil(desiredParticleCount / particlesWidth); //then we calculate the particlesHeight that produces the closest particle count

        var particleCount = particlesWidth * particlesHeight;
        var particlePositions = [];
        
        var boxEditor = this.boxEditor;

        var totalVolume = 0;
        for (var i = 0; i < boxEditor.boxes.length; ++i) {
            totalVolume += boxEditor.boxes[i].computeVolume();
        }

        var particlesCreatedSoFar = 0;
        for (var i = 0; i < boxEditor.boxes.length; ++i) {
            var box = boxEditor.boxes[i];
            
            var particlesInBox = 0;
            if (i < boxEditor.boxes.length - 1) { 
                particlesInBox = Math.floor(particleCount * box.computeVolume() / totalVolume);
            } else { //for the last box we just use up all the remaining particles
                particlesInBox = particleCount - particlesCreatedSoFar;
            }

            for (var j = 0; j < particlesInBox; ++j) {
                var position = box.randomPoint();
                particlePositions.push(position);
            }

            particlesCreatedSoFar += particlesInBox;
        }

        var gridCells = GRID_WIDTH * GRID_HEIGHT * GRID_DEPTH * this.gridCellDensity;

        //assuming x:y:z ratio of 2:1:1
        var gridResolutionY = Math.ceil(Math.pow(gridCells / 2, 1.0 / 3.0));
        var gridResolutionZ = gridResolutionY * 1;
        var gridResolutionX = gridResolutionY * 2;


        var gridSize = [GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH];
        var gridResolution = [gridResolutionX, gridResolutionY, gridResolutionZ];

        var sphereRadius = 7.0 / gridResolutionX;
        this.simulatorRenderer.reset(particlesWidth, particlesHeight, particlePositions, gridSize, gridResolution, PARTICLES_PER_CELL, sphereRadius);

        this.camera.setBounds(0, Math.PI / 2);
    }

    //go back to box editing
    //SIMULATING -> EDITING
    FluidParticles.prototype.stopSimulation = function () {
        this.state = State.EDITING;

        this.camera.setBounds(-Math.PI / 4, Math.PI / 4);
    }

    FluidParticles.prototype.update = function () {
        if (this.state === State.EDITING) {
            this.boxEditor.draw();
        } else if (this.state === State.SIMULATING) {
            this.simulatorRenderer.update(this.timeStep);
        }
    }

    return FluidParticles;
}());

