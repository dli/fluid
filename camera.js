'use strict'

var Camera = (function () {
    var SENSITIVITY = 0.005;

    var MIN_DISTANCE = 25.0;
    var MAX_DISTANCE = 60.0;

    function Camera (element, orbitPoint) {
        this.element = element;
        this.distance = 40.0;
        this.orbitPoint = orbitPoint;

        this.azimuth = 0.0,
        this.elevation = 0.25

        this.minElevation = -Math.PI / 4;
        this.maxElevation = Math.PI / 4;

        this.currentMouseX = 0,
        this.currentMouseY = 0;

        this.lastMouseX = 0,
        this.lastMouseY = 0;

        this.mouseDown = false;

        this.viewMatrix = new Float32Array(16);


        this.recomputeViewMatrix();


        element.addEventListener('wheel', (function (event) {
            var scrollDelta = event.deltaY;
            this.distance += ((scrollDelta > 0) ? 1 : -1) * 2.0;

            if (this.distance < MIN_DISTANCE) this.distance = MIN_DISTANCE;
            if (this.distance > MAX_DISTANCE) this.distance = MAX_DISTANCE;

            this.recomputeViewMatrix();
        }).bind(this));
    };

    Camera.prototype.recomputeViewMatrix = function () {
        var xRotationMatrix = new Float32Array(16),
            yRotationMatrix = new Float32Array(16),
            distanceTranslationMatrix = Utilities.makeIdentityMatrix(new Float32Array(16)),
            orbitTranslationMatrix = Utilities.makeIdentityMatrix(new Float32Array(16));

        Utilities.makeIdentityMatrix(this.viewMatrix);

        Utilities.makeXRotationMatrix(xRotationMatrix, this.elevation);
        Utilities.makeYRotationMatrix(yRotationMatrix, this.azimuth);
        distanceTranslationMatrix[14] = -this.distance;
        orbitTranslationMatrix[12] = -this.orbitPoint[0];
        orbitTranslationMatrix[13] = -this.orbitPoint[1];
        orbitTranslationMatrix[14] = -this.orbitPoint[2];

        Utilities.premultiplyMatrix(this.viewMatrix, this.viewMatrix, orbitTranslationMatrix);
        Utilities.premultiplyMatrix(this.viewMatrix, this.viewMatrix, yRotationMatrix);
        Utilities.premultiplyMatrix(this.viewMatrix, this.viewMatrix, xRotationMatrix);
        Utilities.premultiplyMatrix(this.viewMatrix, this.viewMatrix, distanceTranslationMatrix);
    };

    Camera.prototype.getPosition = function () {
        var position = [
            this.distance * Math.sin(Math.PI / 2 - this.elevation) * Math.sin(-this.azimuth) + this.orbitPoint[0],
            this.distance * Math.cos(Math.PI / 2 - this.elevation) + this.orbitPoint[1],
            this.distance * Math.sin(Math.PI / 2 - this.elevation) * Math.cos(-this.azimuth) + this.orbitPoint[2]
        ];

        return position;
    };

    Camera.prototype.isMouseDown = function () {
        return this.mouseDown;
    };

    Camera.prototype.getViewMatrix = function () {
        return this.viewMatrix;
    };

    Camera.prototype.setBounds = function (minElevation, maxElevation) {
        this.minElevation = minElevation;
        this.maxElevation = maxElevation;

        if (this.elevation > this.maxElevation) this.elevation = this.maxElevation;
        if (this.elevation < this.minElevation) this.elevation = this.minElevation;

        this.recomputeViewMatrix();
    };

    Camera.prototype.onMouseDown = function (event) {
        event.preventDefault();

        var x = Utilities.getMousePosition(event, this.element).x;
        var y = Utilities.getMousePosition(event, this.element).y;

        this.mouseDown = true;
        this.lastMouseX = x;
        this.lastMouseY = y;
    };

    Camera.prototype.onMouseUp = function (event) {
        event.preventDefault();

        this.mouseDown = false;
    };

    Camera.prototype.onMouseMove = function (event) {
        event.preventDefault();

        var x = Utilities.getMousePosition(event, this.element).x;
        var y = Utilities.getMousePosition(event, this.element).y;

        if (this.mouseDown) {
            this.currentMouseX = x;
            this.currentMouseY = y;

            var deltaAzimuth = (this.currentMouseX - this.lastMouseX) * SENSITIVITY;
            var deltaElevation = (this.currentMouseY - this.lastMouseY) * SENSITIVITY;

            this.azimuth += deltaAzimuth;
            this.elevation += deltaElevation;

            if (this.elevation > this.maxElevation) this.elevation = this.maxElevation;
            if (this.elevation < this.minElevation) this.elevation = this.minElevation;

            this.recomputeViewMatrix();

            this.lastMouseX = this.currentMouseX;
            this.lastMouseY = this.currentMouseY;
        }
    };

    return Camera;
}());
