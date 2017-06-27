/*
 * The Mandelbrot Set, in HTML5 canvas and javascript.
 * https://github.com/cslarsen/mandelbrot-js
 *
 * Copyright (C) 2012 Christian Stigen Larsen
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.  You may obtain
 * a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 */

interface IColorGenerator<TData> {
    getColor(data: TData): number[];
}

abstract class BaseMandelbrotColorGenerator implements IColorGenerator<number[]> {
    protected steps: number;

    public getSteps() {
        return this.steps;
    }

    constructor(steps: number) {
        this.steps = steps;
    }

    getColor(data: number[]): number[] {
        var [n, Tr, Ti] = data;

        return this.colorPicker(n, Tr, Ti);
    }

    protected abstract colorPicker(n: number, Tr: number, Ti: number): number[];
}




class MandelbrotColorGenerators {
// Some constants used with smoothColor
    private static logBase = 1.0 / Math.log(2.0);
    private static logHalfBase = Math.log(0.5) * 1.0 / Math.log(2.0);

    public static smoothColor(steps: number, n: number, Tr: number, Ti: number): number {
        /*
         * Original smoothing equation is
         *
         * var v = 1 + n - Math.log(Math.log(Math.sqrt(Zr*Zr+Zi*Zi)))/Math.log(2.0);
         *
         * but can be simplified using some elementary logarithm rules to
         */
        return 5 + n - this.logHalfBase - Math.log(Math.log(Tr + Ti)) * this.logBase;
    }
}

class HSV1 extends BaseMandelbrotColorGenerator {
    protected colorPicker(n: number, Tr: number, Ti: number): number[] {
        if (n === this.steps) // converged?
            return interiorColor;

        var v = MandelbrotColorGenerators.smoothColor(this.steps, n, Tr, Ti);
        var c = hsv_to_rgb(360.0 * v / this.steps, 1.0, 1.0);
        c.push(255); // alpha
        return c;
    }
}

class HSV2 extends BaseMandelbrotColorGenerator {
    protected colorPicker(n: number, Tr: number, Ti: number): number[] {
        if (n === this.steps) // converged?
            return interiorColor;

        var v = MandelbrotColorGenerators.smoothColor(this.steps, n, Tr, Ti);
        var c = hsv_to_rgb(360.0 * v / this.steps, 1.0, 10.0 * v / this.steps);
        c.push(255); // alpha
        return c;
    }
}

class HSV3 extends BaseMandelbrotColorGenerator {
    protected colorPicker(n: number, Tr: number, Ti: number): number[] {
        if (n === this.steps) // converged?
            return interiorColor;

        var v = MandelbrotColorGenerators.smoothColor(this.steps, n, Tr, Ti);
        var c = hsv_to_rgb(360.0 * v / this.steps, 1.0, 10.0 * v / this.steps);

        // swap red and blue
        var t = c[0];
        c[0] = c[2];
        c[2] = t;

        c.push(255); // alpha
        return c;
    }
}

class ColorGrayScale extends BaseMandelbrotColorGenerator {
    protected colorPicker(n: number, Tr: number, Ti: number): number[] {
        if (n === this.steps) // converged?
            return interiorColor;

        var v = MandelbrotColorGenerators.smoothColor(this.steps, n, Tr, Ti);
        v = Math.floor(512.0 * v / this.steps);
        if (v > 255) v = 255;
        return [v, v, v, 255];
    }
}

class ColorGrayScale2 extends ColorGrayScale {
    protected colorPicker(n: number, Tr: number, Ti: number): number[] {
        if (n === this.steps) { // converged?
            var c = 255 - Math.floor(255.0 * Math.sqrt(Tr + Ti)) % 255;
            if (c < 0) c = 0;
            if (c > 255) c = 255;
            return [c, c, c, 255];
        }

        return super.colorPicker(n, Tr, Ti);
    }
}

class NewtonGrayscaleColorGenerator implements IColorGenerator<number[]> {
    private _steps: number;

    constructor(steps: number) {
        this._steps = steps;
    }

    getColor(data: number[]): number[] {
        var n = data[0];
        if (n === this._steps) // converged?
            return interiorColor;
        var gray = 255.0 * ((this._steps-data[0]) / (this._steps * 1.0));
        return [gray, gray, gray, 255];
    }
}

class NewtonColorfulColorGenerator implements IColorGenerator<number[]> {
    private _factor: number;
    private _steps: number;

    constructor(steps: number, factor : number) {
        this._factor = factor;
        this._steps = steps;
    }

    getColor(data: number[]): number[] {
        var [n,x,y] = data;
        if (n === this._steps) // converged?
            return interiorColor;

        var rounded = Math.round(y / (2 * Math.PI));

        var product = rounded * this._factor;

        var r = product % 255;
        product /= 255;
        var g = product % 255;
        product /= 255;
        var b = product % 255;

        var array = [r, g, b];

        for (let i = 0; i < array.length; i++) {
            let value = array[i];
            if (value < 0) {
                array[i] = value + 255;
            }
        }

        var scale = (this._steps-n) / (this._steps * 1.0);

        for (let i = 0; i < array.length; i++) {
            array[i] *= scale;
        }

        return [...array, 255];
    }
}


class NewtonAlgorithm {
    private _iterations: number;
    private _escapeRadius: number;

    constructor(radius: number, iterations: number) {
        this._iterations = iterations;
        this._escapeRadius = Math.pow(10, -radius);
    }

    public iterateEquation(cRealPart: number, cImaginaryPart: number) {
        var zRealPart = cRealPart;
        var zImaginaryPart = cImaginaryPart;
        var zRealSquared;
        var zImaginarySquared;
        var n = 0;

        do {
            var modulus = Math.exp(zRealPart);
            var cosine = Math.cos(zImaginaryPart);
            var sine = Math.sin(zImaginaryPart);

            var realFunc = -1 + modulus * cosine;
            var imaginaryFunc = modulus * sine;

            var modulusInverse = Math.exp(-zRealPart);
            zRealPart = zRealPart - 1 + modulusInverse * cosine;
            zImaginaryPart = zImaginaryPart - modulusInverse * sine;

            zRealSquared = realFunc * realFunc;
            zImaginarySquared = imaginaryFunc * imaginaryFunc;
            n++;
        }
        while ((n < this._iterations) && (zRealSquared + zImaginarySquared) >= this._escapeRadius)

        if (!(zRealSquared + zImaginarySquared < this._escapeRadius)) {
            n = this._iterations;
        }

        return [n, zRealPart, zImaginaryPart];
    }

    public static ColorGenerator = new class {
        Grayscale(steps: number) {
            return new NewtonGrayscaleColorGenerator(steps);
        }

        Colored(steps: number) {
            return new NewtonColorfulColorGenerator(steps, 6408327);
        }
    }
}

class MandelbrotAlgorithm {
    private _iterations: number;
    private _escapeRadius: number;

    constructor(radius: number, iterations: number) {
        this._iterations = iterations;
        this._escapeRadius = radius;
    }

    //  Main renderer equation.
    //  
    //  Returns number of iterations and values of Z_{n}^2 = Tr + Ti at the time
    //  we either converged (n == iterations) or diverged.  We use these to
    //  determined the color at the current pixel.
    //  
    //  The Mandelbrot set is rendered taking
    //  
    //      Z_{n+1} = Z_{n} + C
    //  
    //  with C = x + iy, based on the "look at" coordinates.
    //  
    //  The Julia set can be rendered by taking
    //  
    //      Z_{0} = C = x + iy
    //      Z_{n+1} = Z_{n} + K
    //  
    //  for some arbitrary constant K.  The point C for Z_{0} must be the
    //  current pixel we're rendering, but K could be based on the "look at"
    //  coordinate, or by letting the user select a point on the screen.
    public iterateEquation(cRealPart: number, cImaginaryPart: number) {
        var zRealPart = 0;
        var zImaginaryPart = 0;
        var zRealSquared = 0;
        var zImaginarySquared = 0;
        var n = 0;

        for (; n < this._iterations && (zRealSquared + zImaginarySquared) <= this._escapeRadius; ++n) {
            zImaginaryPart = 2 * zRealPart * zImaginaryPart + cImaginaryPart;
            zRealPart = zRealSquared - zImaginarySquared + cRealPart;
            zRealSquared = zRealPart * zRealPart;
            zImaginarySquared = zImaginaryPart * zImaginaryPart;
        }

        /*
         * Four more iterations to decrease error term;
         * see http://linas.org/art-gallery/escape/escape.html
         */
        for (var e = 0; e < 4; ++e) {
            zImaginaryPart = 2 * zRealPart * zImaginaryPart + cImaginaryPart;
            zRealPart = zRealSquared - zImaginarySquared + cRealPart;
            zRealSquared = zRealPart * zRealPart;
            zImaginarySquared = zImaginaryPart * zImaginaryPart;
        }

        return [n, zRealSquared, zImaginarySquared];
    }

    public static ColorGenerator = new class {
        HSV1(steps: number) {
            return new HSV1(steps);
        }

        HSV2(steps: number) {
            return new HSV2(steps);
        }

        HSV3(steps: number) {
            return new HSV3(steps);
        }

        Grayscale(steps: number) {
            return new ColorGrayScale(steps);
        }

        Grayscale2(steps: number) {
            return new ColorGrayScale2(steps);
        };
    }
}


/*
 * Global variables:
 */
var zoomStart = [4 * Math.PI, 3 * Math.PI];
var zoom = [4 * Math.PI, 3 * Math.PI];
var lookAtDefault = [0, 0];
var lookAt = lookAtDefault;
var xRange = [0, 0];
var yRange = [0, 0];
var escapeRadius = 10.0;
var interiorColor = [0, 0, 0, 255];
var reInitCanvas = true; // Whether to reload canvas size, etc
var dragToZoom = true;
var colors = [[0, 0, 0, 0]];
var renderId = 0; // To zoom before current render is finished

/*
 * Initialize canvas
 */
var canvas: HTMLCanvasElement = $<HTMLCanvasElement>('canvasMandelbrot');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
//
var ccanvas = $<HTMLCanvasElement>('canvasControls');
ccanvas.width = window.innerWidth;
ccanvas.height = window.innerHeight;
//
var ctx = canvas.getContext('2d');
var img = ctx.createImageData(canvas.width, 1);

/*
 * Just a shorthand function: Fetch given element, jQuery-style
 */
function $<TElement extends HTMLElement>(id: string) {
    return <TElement>document.getElementById(id);
}

function focusOnSubmit() {
    var e = $<HTMLInputElement>('submitButton');
    if (e) e.focus();
}

function getColorPicker(): (steps) => IColorGenerator<number[]> {
    var colorSchemeValue = $<HTMLSelectElement>("colorScheme").value;
    return NewtonAlgorithm.ColorGenerator[colorSchemeValue];
}

function getSamples() {
    return 1;
    //var i = parseInt($<HTMLInputElement>('superSamples').value, 10);
    //return i <= 0 ? 1 : i;
}

/*
 * Update URL's hash with render parameters so we can pass it around.
 */
function updateHashTag(samples: number, iterations: number) {
    var radius = $<HTMLInputElement>('escapeRadius').value;
    var scheme = $<HTMLInputElement>('colorScheme').value;

    location.hash = 'zoom=' + zoom + '&' +
        'lookAt=' + lookAt + '&' +
        'iterations=' + iterations + '&' +
        //'superSamples=' + samples + '&' +
        'escapeRadius=' + radius + '&' +
        'colorScheme=' + scheme;
}

/*
 * Update small info box in lower right hand side
 */
function updateInfoBox() {
    // Update infobox
    $<HTMLDivElement>('infoBox').innerHTML =
        'x<sub>0</sub>=' + xRange[0] + ' y<sub>0</sub>=' + yRange[0] + ' ' +
        'x<sub>1</sub>=' + xRange[1] + ' y<sub>1</sub>=' + yRange[1] + ' ' +
        'w&#10799;h=' + canvas.width + 'x' + canvas.height + ' '
        + (canvas.width * canvas.height / 1000000.0).toFixed(1) + 'MP';
}

/*
 * Parse URL hash tag, returns whether we should redraw.
 */
function readHashTag() {
    var redraw = false;
    var tags = location.hash.split('&');

    for (var i = 0; i < tags.length; ++i) {
        var tag = tags[i].split('=');
        var key = tag[0];
        var val = tag[1];

        switch (key) {
            case '#zoom': {
                var z = val.split(',');
                zoom = [parseFloat(z[0]), parseFloat(z[1])];
                redraw = true;
            } break;

            case 'lookAt': {
                var l = val.split(',');
                lookAt = [parseFloat(l[0]), parseFloat(l[1])];
                redraw = true;
            } break;

            case 'iterations': {
                $<HTMLInputElement>('steps').value = String(parseInt(val, 10));
                //$<HTMLInputElement>('autoIterations').checked = false;                    

                redraw = true;
            } break;

            case 'escapeRadius': {
                escapeRadius = parseFloat(val);
                $<HTMLInputElement>('escapeRadius').value = String(escapeRadius);
                redraw = true;
            } break;

            case 'superSamples': {
                $<HTMLInputElement>('superSamples').value = String(parseInt(val, 10));
                redraw = true;
            } break;

            case 'colorScheme': {
                $<HTMLInputElement>('colorScheme').value = String(val);
                redraw = true;
            } break;
        }
    }

    if (redraw)
        reInitCanvas = true;

    return redraw;
}

/*
 * Return number with metric units
 */
function metric_units(number: number) {
    var unit = ["", "k", "M", "G", "T", "P", "E"];
    var mag = Math.ceil((1 + Math.log(number) / Math.log(10)) / 3);
    return "" + (number / Math.pow(10, 3 * (mag - 1))).toFixed(2) + unit[mag];
}

/*
 * Convert hue-saturation-value/luminosity to RGB.
 *
 * Input ranges:
 *   H =   [0, 360] (integer degrees)
 *   S = [0.0, 1.0] (float)
 *   V = [0.0, 1.0] (float)
 */
function hsv_to_rgb(h: number, s: number, v: number) {
    if (v > 1.0) v = 1.0;
    var hp = h / 60.0;
    var c = v * s;
    var x = c * (1 - Math.abs((hp % 2) - 1));
    var rgb = [0, 0, 0];

    if (0 <= hp && hp < 1) rgb = [c, x, 0];
    if (1 <= hp && hp < 2) rgb = [x, c, 0];
    if (2 <= hp && hp < 3) rgb = [0, c, x];
    if (3 <= hp && hp < 4) rgb = [0, x, c];
    if (4 <= hp && hp < 5) rgb = [x, 0, c];
    if (5 <= hp && hp < 6) rgb = [c, 0, x];

    var m = v - c;
    rgb[0] += m;
    rgb[1] += m;
    rgb[2] += m;

    rgb[0] *= 255;
    rgb[1] *= 255;
    rgb[2] *= 255;
    return rgb;
}

/*
 * Adjust aspect ratio based on plot ranges and canvas dimensions.
 */
function adjustAspectRatio(xRange: number[], yRange: number[], canvas: HTMLCanvasElement) {
    var ratio = Math.abs(xRange[1] - xRange[0]) / Math.abs(yRange[1] - yRange[0]);
    var sratio = canvas.width / canvas.height;
    if (sratio > ratio) {
        var xf = sratio / ratio;
        xRange[0] *= xf;
        xRange[1] *= xf;
        zoom[0] *= xf;
    } else {
        var yf = ratio / sratio;
        yRange[0] *= yf;
        yRange[1] *= yf;
        zoom[1] *= yf;
    }
}

function addRGB(v: number[], w: number[]) {
    v[0] += w[0];
    v[1] += w[1];
    v[2] += w[2];
    v[3] += w[3];
    return v;
}

function divRGB(v: number[], div: number) {
    v[0] /= div;
    v[1] /= div;
    v[2] /= div;
    v[3] /= div;
    return v;
}

/*
 * Render the Mandelbrot set
 */
function draw(generatorFactory: (steps:number) => IColorGenerator<number[]>, superSamples: number) {
    if (lookAt === null) lookAt = [-Math.PI, -Math.PI];
    if (zoom === null) zoom = zoomStart;

    xRange = [lookAt[0] - zoom[0] / 2, lookAt[0] + zoom[0] / 2];
    yRange = [lookAt[1] - zoom[1] / 2, lookAt[1] + zoom[1] / 2];

    if (reInitCanvas) {
        reInitCanvas = false;

        canvas = $<HTMLCanvasElement>('canvasMandelbrot');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        ccanvas = $<HTMLCanvasElement>('canvasControls');
        ccanvas.width = window.innerWidth;
        ccanvas.height = window.innerHeight;

        ctx = canvas.getContext('2d');
        img = ctx.createImageData(canvas.width, 1);

        adjustAspectRatio(xRange, yRange, canvas);
    }

    var steps = parseInt($<HTMLInputElement>('steps').value, 10);

    //if ($<HTMLInputElement>('autoIterations').checked) {
    //    var f = Math.sqrt(
    //        0.001 + 2.0 * Math.min(
    //            Math.abs(xRange[0] - xRange[1]),
    //            Math.abs(yRange[0] - yRange[1])));

    //    steps = Math.floor(223.0 / f);
    //    $<HTMLInputElement>('steps').value = String(steps);
    //}

    var generator = generatorFactory(steps);

    var escapeRadius = parseFloat($<HTMLInputElement>('escapeRadius').value);
    var dx = (xRange[1] - xRange[0]) / (0.5 + (canvas.width - 1));
    var dy = (yRange[1] - yRange[0]) / (0.5 + (canvas.height - 1));
    var Ci_step = (yRange[1] - yRange[0]) / (0.5 + (canvas.height - 1));

    updateHashTag(superSamples, steps);
    updateInfoBox();

    // Only enable one render at a time
    renderId += 1;

    var fractal = new NewtonAlgorithm(escapeRadius, steps);

    function drawLineSuperSampled(Ci: number, off: number, Cr_init: number, Cr_step: number) {
        var Cr = Cr_init;

        for (var x = 0; x < canvas.width; ++x, Cr += Cr_step) {
            var color = [0, 0, 0, 255];

            for (var s = 0; s < superSamples; ++s) {
                var rx = Math.random() * Cr_step;
                var ry = Math.random() * Ci_step;
                var p = fractal.iterateEquation(Cr - rx / 2, Ci - ry / 2);
                color = addRGB(color, generator.getColor(p));
            }

            color = divRGB(color, superSamples);

            img.data[off++] = color[0];
            img.data[off++] = color[1];
            img.data[off++] = color[2];
            img.data[off++] = 255;
        }
    }

    function drawLine(Ci: number, off: number, Cr_init: number, Cr_step: number) {
        var Cr = Cr_init;

        for (var x = 0; x < canvas.width; ++x, Cr += Cr_step) {
            var p = fractal.iterateEquation(Cr, Ci);
            var color = generator.getColor(p);
            img.data[off++] = color[0];
            img.data[off++] = color[1];
            img.data[off++] = color[2];
            img.data[off++] = 255;
        }
    }

    function drawSolidLine(y: number, color: number[]) {
        var off = y * canvas.width;

        for (var x = 0; x < canvas.width; ++x) {
            img.data[off++] = color[0];
            img.data[off++] = color[1];
            img.data[off++] = color[2];
            img.data[off++] = color[3];
        }
    }

    function render() {
        var start = (new Date).getTime();
        var startHeight = canvas.height;
        var startWidth = canvas.width;
        var lastUpdate = start;
        var updateTimeout = parseFloat($<HTMLInputElement>("updateTimeout").value);
        var pixels = 0;
        var Ci = yRange[0];
        var sy = 0;
        var drawLineFunc = superSamples > 1 ? drawLineSuperSampled : drawLine;
        var ourRenderId = renderId;

        var scanline = () => {
            if (renderId !== ourRenderId ||
                startHeight !== canvas.height ||
                startWidth !== canvas.width) {
                // Stop drawing
                return;
            }

            drawLineFunc(Ci, 0, xRange[0], dx);
            Ci += Ci_step;
            pixels += canvas.width;
            ctx.putImageData(img, 0, sy);

            var now = (new Date).getTime();

            /*
           * Javascript is inherently single-threaded, and the way
           * you yield thread control back to the browser is MYSTERIOUS.
           *
           * People seem to use setTimeout() to yield, which lets us
           * make sure the canvas is updated, so that we can do animations.
           *
           * But if we do that for every scanline, it will take 100x longer
           * to render everything, because of overhead.  So therefore, we'll
           * do something in between.
           */
            if (sy++ < canvas.height) {
                if ((now - lastUpdate) >= updateTimeout) {
                    // show the user where we're rendering
                    drawSolidLine(0, [255, 59, 3, 255]);
                    ctx.putImageData(img, 0, sy);

                    // Update speed and time taken
                    var elapsedMS = now - start;
                    $<HTMLSpanElement>('renderTime').innerHTML = (elapsedMS / 1000.0).toFixed(1); // 1 comma

                    var speed = Math.floor(pixels / elapsedMS);

                    if (metric_units(speed).substr(0, 3) == "NaN") {
                        speed = Math.floor(60.0 * pixels / elapsedMS);
                        $<HTMLSpanElement>('renderSpeedUnit').innerHTML = 'minute';
                    } else
                        $<HTMLSpanElement>('renderSpeedUnit').innerHTML = 'second';

                    $<HTMLSpanElement>('renderSpeed').innerHTML = metric_units(speed);

                    // yield control back to browser, so that canvas is updated
                    lastUpdate = now;
                    setTimeout(scanline, 0);
                } else
                    scanline();
            }
        };

        // Disallow redrawing while rendering
        scanline();
    }

    render();
}

function main() {
    $<HTMLInputElement>('viewPNG').onclick = (): void => {
        location.href = canvas.toDataURL('image/png');
    };

    $<HTMLInputElement>('steps').onkeypress = (): void => {
        // disable auto-iterations when user edits it manually
        //$<HTMLInputElement>('autoIterations').checked = false;
    }

    $<HTMLInputElement>('resetButton').onclick = event => {
        $<HTMLFormElement>('settingsForm').reset();
        setTimeout(() => { location.hash = ''; }, 1);
        zoom = zoomStart;
        lookAt = lookAtDefault;
        reInitCanvas = true;
        draw(getColorPicker(), getSamples());
    };

    if (dragToZoom) {
        var box: number[] = null;

        $<HTMLCanvasElement>('canvasControls').onmousedown = e => {
            if (box == null)
                box = [e.clientX, e.clientY, 0, 0];
        }

        $<HTMLCanvasElement>('canvasControls').onmousemove = e => {
            if (box != null) {
                var c = ccanvas.getContext('2d');
                c.lineWidth = 1;

                // clear out old box first
                c.clearRect(0, 0, ccanvas.width, ccanvas.height);

                // draw new box
                c.strokeStyle = '#FF3B03';
                box[2] = e.clientX;
                box[3] = e.clientY;
                c.strokeRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
            }
        }

        var zoomOut = (event: MouseEvent) => {
            var x = event.clientX;
            var y = event.clientY;

            var w = window.innerWidth;
            var h = window.innerHeight;

            var dx = (xRange[1] - xRange[0]) / (0.5 + (canvas.width - 1));
            var dy = (yRange[1] - yRange[0]) / (0.5 + (canvas.height - 1));

            x = xRange[0] + x * dx;
            y = yRange[0] + y * dy;

            lookAt = [x, y];

            if (event.shiftKey) {
                zoom[0] /= 0.5;
                zoom[1] /= 0.5;
            }

            draw(getColorPicker(), getSamples());
        };

        $<HTMLCanvasElement>('canvasControls').onmouseup = e => {
            if (box != null) {
                // Zoom out?
                if (e.shiftKey) {
                    box = null;
                    zoomOut(e);
                    return;
                }

                /*
           * Cleaer entire canvas
           */
                var c = ccanvas.getContext('2d');
                c.clearRect(0, 0, ccanvas.width, ccanvas.height);

                /*
           * Calculate new rectangle to render
           */
                var x = Math.min(box[0], box[2]) + Math.abs(box[0] - box[2]) / 2.0;
                var y = Math.min(box[1], box[3]) + Math.abs(box[1] - box[3]) / 2.0;

                var dx = (xRange[1] - xRange[0]) / (0.5 + (canvas.width - 1));
                var dy = (yRange[1] - yRange[0]) / (0.5 + (canvas.height - 1));

                x = xRange[0] + x * dx;
                y = yRange[0] + y * dy;

                lookAt = [x, y];

                /*
           * This whole code is such a mess ...
           */

                var xf = Math.abs(Math.abs(box[0] - box[2]) / canvas.width);
                var yf = Math.abs(Math.abs(box[1] - box[3]) / canvas.height);

                zoom[0] *= Math.max(xf, yf); // retain aspect ratio
                zoom[1] *= Math.max(xf, yf);

                box = null;
                draw(getColorPicker(), getSamples());
            }
        }
    }

    /*
     * Enable zooming (currently, the zooming is inexact!) Click to zoom;
     * perfect to mobile phones, etc.
     */
    if (dragToZoom === false) {
        $<HTMLCanvasElement>('canvasMandelbrot').onclick = event => {
            var x = event.clientX;
            var y = event.clientY;
            var w = window.innerWidth;
            var h = window.innerHeight;

            var dx = (xRange[1] - xRange[0]) / (0.5 + (canvas.width - 1));
            var dy = (yRange[1] - yRange[0]) / (0.5 + (canvas.height - 1));

            x = xRange[0] + x * dx;
            y = yRange[0] + y * dy;

            lookAt = [x, y];

            if (event.shiftKey) {
                zoom[0] /= 0.5;
                zoom[1] /= 0.5;
            } else {
                zoom[0] *= 0.5;
                zoom[1] *= 0.5;
            }

            draw(getColorPicker(), getSamples());
        };
    }

    /*
     * When resizing the window, be sure to update all the canvas stuff.
     */
    window.onresize = (): void => {
        reInitCanvas = true;
    };

    /*
     * Read hash tag and render away at page load.
     */
    readHashTag();

    /*
     * This is the weirdest bug ever.  When I go directly to a link like
     *
     *   mandelbrot.html#zoom=0.01570294345468629,0.010827482681521361&
     *   lookAt=-0.3083866260309053,-0.6223590662533901&iterations=5000&
     *   superSamples=1&escapeRadius=16&colorScheme=pickColorHSV2
     *
     * it will render a black image, but if I call the function twice, it
     * works nicely.  Must be a global variable that's not been set upon the
     * first entry to the function (TODO: Find out what's wrong).
     *
     * Yeah, I know, the code is a total mess at the moment.  I'll get back
     * to that.
     */
    draw(getColorPicker(), getSamples());
    draw(getColorPicker(), getSamples());
}

main();