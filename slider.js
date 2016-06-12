'use strict'

var Slider = (function () {

    //changeCallback is called with the new value
    var Slider = function (element, initial, min, max, changeCallback) {
        this.value = initial;

        this.min = min;
        this.max = max;

        this.div = element;

        this.innerDiv = document.createElement('div');
        this.innerDiv.style.position = 'absolute';
        this.innerDiv.style.height = this.div.offsetHeight + 'px';

        this.div.appendChild(this.innerDiv);

        this.changeCallback = changeCallback;

        this.mousePressed = false;

        this.redraw();

        this.div.addEventListener('mousedown', (function (event) {
            this.mousePressed = true;
            this.onChange(event);
        }).bind(this));

        document.addEventListener('mouseup', (function (event) {
            this.mousePressed = false;
        }).bind(this));

        document.addEventListener('mousemove', (function (event) {
            if (this.mousePressed) {
                this.onChange(event);
            }
        }).bind(this));

    };

    Slider.prototype.redraw = function () {
        var fraction = (this.value - this.min) / (this.max - this.min);
        this.innerDiv.style.width = fraction * this.div.offsetWidth + 'px';
        this.innerDiv.style.height = this.div.offsetHeight + 'px';
    }

    Slider.prototype.onChange = function (event) {
        var mouseX = Utilities.getMousePosition(event, this.div).x;
        this.value = Utilities.clamp((mouseX / this.div.offsetWidth) * (this.max - this.min) + this.min, this.min, this.max);

        this.redraw();

        this.changeCallback(this.value);
    }

    return Slider;
}());
