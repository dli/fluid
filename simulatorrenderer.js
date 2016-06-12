var SimulatorRenderer = (function () {
    function SimulatorRenderer (canvas, wgl, projectionMatrix, camera, gridDimensions, onLoaded) {
        this.canvas = canvas;
        this.wgl = wgl;
        this.projectionMatrix = projectionMatrix;
        this.camera = camera;


        wgl.getExtension('OES_texture_float');
        wgl.getExtension('OES_texture_float_linear');

        var rendererLoaded = false,
            simulatorLoaded = false;

        this.renderer = new Renderer(this.canvas, this.wgl, gridDimensions, (function () {
            rendererLoaded = true;  
            if (rendererLoaded && simulatorLoaded) {
                start.call(this);
            }
        }).bind(this));

        this.simulator = new Simulator(this.wgl, (function () {
            simulatorLoaded = true;
            if (rendererLoaded && simulatorLoaded) {
                start.call(this);
            }
        }).bind(this));


        function start () {
            /////////////////////////////////////////////
            // interaction stuff

            //mouse position is in [-1, 1]
            this.mouseX = 0;
            this.mouseY = 0;

            //the mouse plane is a plane centered at the camera orbit point and orthogonal to the view direction
            this.lastMousePlaneX = 0;
            this.lastMousePlaneY = 0;

            setTimeout(onLoaded, 1);
        }
    }

    SimulatorRenderer.prototype.onMouseMove = function (event) {
        var position = Utilities.getMousePosition(event, this.canvas);
        var normalizedX = position.x / this.canvas.width;
        var normalizedY = position.y / this.canvas.height;

        this.mouseX = normalizedX * 2.0 - 1.0;
        this.mouseY = (1.0 - normalizedY) * 2.0 - 1.0;

        this.camera.onMouseMove(event);
    };

    SimulatorRenderer.prototype.onMouseDown = function (event) {
        this.camera.onMouseDown(event);
    };

    SimulatorRenderer.prototype.onMouseUp = function (event) {
        this.camera.onMouseUp(event);
    };

    SimulatorRenderer.prototype.reset = function (particlesWidth, particlesHeight, particlePositions, gridSize, gridResolution, particleDensity, sphereRadius) {
        this.simulator.reset(particlesWidth, particlesHeight, particlePositions, gridSize, gridResolution, particleDensity);
        this.renderer.reset(particlesWidth, particlesHeight, sphereRadius);
    }

    SimulatorRenderer.prototype.update = function (timeStep) {
        var fov = 2.0 * Math.atan(1.0 / this.projectionMatrix[5]);

        var viewSpaceMouseRay = [
            this.mouseX * Math.tan(fov / 2.0) * (this.canvas.width / this.canvas.height),
            this.mouseY * Math.tan(fov / 2.0),
            -1.0];

        var mousePlaneX = viewSpaceMouseRay[0] * this.camera.distance;
        var mousePlaneY = viewSpaceMouseRay[1] * this.camera.distance;
        
        var mouseVelocityX = mousePlaneX - this.lastMousePlaneX;
        var mouseVelocityY = mousePlaneY - this.lastMousePlaneY;

        if (this.camera.isMouseDown()) {
            mouseVelocityX = 0.0;
            mouseVelocityY = 0.0;
        }

        this.lastMousePlaneX = mousePlaneX;
        this.lastMousePlaneY = mousePlaneY;

        var inverseViewMatrix = Utilities.invertMatrix([], this.camera.getViewMatrix());
        var worldSpaceMouseRay = Utilities.transformDirectionByMatrix([], viewSpaceMouseRay, inverseViewMatrix);
        Utilities.normalizeVector(worldSpaceMouseRay, worldSpaceMouseRay);


        var cameraViewMatrix = this.camera.getViewMatrix();
        var cameraRight = [cameraViewMatrix[0], cameraViewMatrix[4], cameraViewMatrix[8]];
        var cameraUp = [cameraViewMatrix[1], cameraViewMatrix[5], cameraViewMatrix[9]];

        var mouseVelocity = [];
        for (var i = 0; i < 3; ++i) {
            mouseVelocity[i] = mouseVelocityX * cameraRight[i] + mouseVelocityY * cameraUp[i];
        }

        this.simulator.simulate(timeStep, mouseVelocity, this.camera.getPosition(), worldSpaceMouseRay);
        this.renderer.draw(this.simulator, this.projectionMatrix, this.camera.getViewMatrix());
    }

    SimulatorRenderer.prototype.onResize = function (event) {
        this.renderer.onResize(event);
    }

    return SimulatorRenderer;
}());
