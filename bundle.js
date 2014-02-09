(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var max = Math.max
var min = Math.min
var toString = Object.prototype.toString

var contextType = "[object CanvasRenderingContext2D]"
var defaults = {
    width: "auto",
    height: "auto",
    srcX: 0,
    srcY: 0,
    dstX: 0,
    dstY: 0,
    outX: 0,
    outY: 0
}

module.exports = blend

function blend(blender, src, dst, out, opts) {
    var srcW, srcH, dstW, dstH, outW, outH, srcImage, dstImage, outImage

    var srcType = toString.apply(src)
    var dstType = toString.apply(dst)
    var outType = toString.apply(out)

    opts = opts || defaults

    var srcX = opts.srcX || defaults.srcX
    var srcY = opts.srcY || defaults.srcY
    var dstX = opts.dstX || defaults.dstX
    var dstY = opts.dstY || defaults.dstY
    var outX = opts.outX || defaults.outX
    var outY = opts.outY || defaults.outY
    var width = opts.width || defaults.width
    var height = opts.height || defaults.height


    if (srcType === contextType) {
        srcW = src.canvas.width
        srcH = src.canvas.height
    } else {
        srcW = src.width
        srcH = src.height
    }

    if (dstType === contextType) {
        dstW = dst.canvas.width
        dstH = dst.canvas.height
    } else {
        dstW = dst.width
        dstH = dst.height
    }

    if (outType === contextType) {
        outW = out.canvas.width
        outH = out.canvas.height
    } else {
        outW = out.width
        outH = out.height
    }

    if (width === "auto") {
        width = srcW
    }

    if (height === "auto") {
        height = srcH
    }

    width = max(0, min(width, srcW - srcX, dstW - dstX, outW - outX))
    height = max(0, min(height, srcH - srcY, dstH - dstY, outH- outY))

    if (width === 0 || height === 0) {
        return
    }

    srcImage = getImageData(src, srcX, srcY, width, height)
    dstImage = getImageData(dst, dstX, dstY, width, height)

    if (out === dst) {
        outImage = dstImage
    } else if (outType !== contextType &&
        outX === 0 &&
        outY === 0 &&
        outW === width &&
        outH === height
    ) {
        outImage = out
    } else {
        outImage = {
            width: width,
            height: height,
            data: new Uint8ClampedArray(width * height * 4)
        }
    }

    blender(srcImage.data, dstImage.data, outImage.data)

    putImageData(out, outImage, outX, outY)
}

function getImageData(image, x, y, width, height) {
    if (toString.apply(image) === contextType) {
        return image.getImageData(x, y, width, height)
    }

    if (x === 0 && y === 0 && width >= image.width && height >= image.height) {
        return image
    }

    var imageData = image.data

    // clamp the width and height
    width = max(0, min(x + width, image.width - x))
    height = max(0, min(y + height, image.height - y))

    var surface = new Uint8ClampedArray(4 * width * height)

    var rowWidth = width * 4
    var srcWidth = image.width * 4
    var srcLeft = 4 * x


    for (var row = 0; row < height; row++) {
        var rowStart = (srcWidth * (row + y)) + srcLeft
        var rowEnd = rowStart + rowWidth

        surface.set(imageData.subarray(rowStart, rowEnd), row * rowWidth)
    }

    return {
        width: width,
        height: height,
        data: surface
    }
}

function putImageData(dst, src, x, y) {
    // if you put an image over itself in the same place then exit early
    if (src === dst && x === 0 && y === 0) {
        return
    }

    if (toString.apply(dst) === contextType) {
        var imageData = dst.createImageData(src.width, src.height)
        imageData.data.set(src.data)
        dst.putImageData(imageData, x, y)
        return
    }

    var srcMinX = x
    var srcMinY = y
    var srcMaxX = x + src.width - 1
    var srcMaxY = y + src.height - 1

    var dstMinX = 0
    var dstMinY = 0
    var dstMaxX = dst.width - 1
    var dstMaxY = dst.height - 1

    // bbox overlap check
    if (srcMinX > dstMaxX || srcMaxX < dstMinX ||
        srcMinY > dstMaxY || srcMaxY < dstMinY) {
        return
    }

    var oMinX = max(srcMinX, dstMinX)
    var oMinY = max(srcMinY, dstMinY)
    var oMaxX = min(srcMaxX, dstMaxX)
    var oMaxY = min(srcMaxY, dstMaxY)


    var source = src.data
    var destination = dst.data

    var srcLeft = max(oMinX - x, 0)
    var srcTop = max(oMinY - y, 0)
    var srcWidth = src.width
    var dstLeft = oMinX
    var dstTop = oMinY
    var dstWidth = dst.width
    var rows = oMaxY - oMinY + 1
    var columns = oMaxX - oMinX + 1

    for (var row = 0; row < rows; row++) {
        var srcStart = 4 * ((srcWidth * (row + srcTop)) + srcLeft)
        var srcEnd = srcStart + (4 * columns)
        var dstStart = 4 * ((dstWidth * (row + dstTop)) + dstLeft)

        destination.set(source.subarray(srcStart, srcEnd), dstStart)
    }
}

},{}],2:[function(require,module,exports){
var byId = require("by/id")
var document = require("global/document")
var isoblend = require("isoblend")
var canvasBlend = require("../canvas-blend")

var imageData = {}

var body = document.body
var bg = byId("bg")
var mode = byId("mode")
var source = byId("source")
var under = byId("under")
var over = byId("over")
var out = byId("out")
var expected = byId("expected")
var total = byId("total")
var wrong = byId("wrong")
var stddev = byId("stddev")
var perf = byId("perf")
var output = byId("output")

var readImageContext = document.createElement("canvas").getContext("2d")
var outContext = out.getContext("2d")

var sourceCount = 0

bg.onchange = updateBackground
mode.onchange = changeSources
source.onchange = changeSources

updateBackground()
changeSources()

function updateBackground() {
    body.style.backgroundImage = "url(images/bg-" + bg.value + ".png)"
    body.className = bg.item(bg.selectedIndex).className
}

function changeSources() {
    sourceCount = 0

    var underSrc = "images/under" + source.selectedIndex + ".png"
    var overSrc = "images/over" + source.selectedIndex + ".png"
    var expectedSrc = "images/multi" +
        source.value +
        "_" +
        mode.value.toLowerCase() +
        ".png"

    var cUnderSrc = under.attributes.src || {}
    var cOverSrc = over.attributes.src || {}
    var cExpectedSrc = expected.attributes.src || {}

    if (cUnderSrc.value !== underSrc) {
        imageData.under = null
        under.onload = function () {
            sourceCount += 1;
            sourcesChanged("under", under)
        }
        under.src = underSrc
    } else {
        imageData.under && sourceCount++
    }

    if (cOverSrc.value !== overSrc) {
        imageData.over = null
        over.onload = function () {
            sourceCount += 1;
            sourcesChanged("over", over)
        }
        over.src = overSrc
    } else {
        imageData.over && sourceCount++
    }

    if (cExpectedSrc.value !== expectedSrc) {
        imageData.expected = null
        expected.onload = function () {
            sourceCount += 1;
            sourcesChanged("expected", expected)
        }
        expected.src = expectedSrc
    } else {
        imageData.expected && sourceCount++
    }

    if (sourceCount === 3) {
        blendOver()
    }
}

function sourcesChanged(name, image) {
    imageData[name] = getImageData(image)

    // All images have loaded
    if (sourceCount === 3) {
        blendOver()
    }
}


function getImageData(image) {
    var width = image.width
    var height = image.height

    readImageContext.canvas.width = width
    readImageContext.canvas.height = height
    readImageContext.drawImage(image, 0, 0)
    return readImageContext.getImageData(0, 0, width, height)
}

function blendOver() {
    if (sourceCount !== 3) {
        return
    }

    var iterations = 50

    var blender = isoblend[mode.value]

    var overImage = imageData.over
    var underImage = imageData.under

    outContext.canvas.width = Math.min(overImage.width, underImage.width)
    outContext.canvas.height = Math.min(overImage.height, underImage.height)

    var t = Date.now()
    for (var i = 0; i < iterations; i += 1) {
        canvasBlend(blender, overImage, underImage, outContext)
    }
    var totalTime = Date.now() - t

    calculateStatistics(mode.value,iterations,totalTime)
}

function calculateStatistics(mode, iterations, totalTime) {
    var exp = imageData.expected.data
    var out = outContext.getImageData(
        0,
        0,
        outContext.canvas.width,
        outContext.canvas.height).data

    var width = Math.min(imageData.expected.width, outContext.canvas.width)
    var height = Math.min(imageData.expected.height, outContext.canvas.height)

    var error = 0, errors = [];
    var px = 0;

    for (var y = 0; y < width; ++y) {
        for (var x = 0; x < height; ++x) {
            var op = pxl(out, px)
            var ep = pxl(exp, px)
            var diff = 0
            var diffs = [
                Math.abs(op.r - ep.r),
                Math.abs(op.g - ep.g),
                Math.abs(op.b - ep.b),
                Math.abs(op.a - ep.a)
            ]

            for (var i = 0; i < 4; ++i) {
                if (diffs[i] > 3) {
                    diff += diffs[i]
                }
            }

            if (diff !== 0) {
                errors.push({
                    px: px,
                    over: pxl(imageData.over.data, px),
                    under:pxl(imageData.under.data, px),
                    out: op,
                    exp: ep,
                    diff:diff
                })

                error += diff * diff
            }

            px += 4;
        }
    }

    error = Math.sqrt(error / (width * height));
    errors.sort(function(a, b) {
        a = a.diff
        b = b.diff
        return a < b ? 1 : a > b ? -1 : 0
    })

    total.textContent = (width * height)
    wrong.textContent = errors.length +
        " (" +
        (100 * errors.length / (width * height)).toFixed(0) +
        "%)"
    stddev.textContent = error.toFixed(3)
    perf.textContent = (iterations / (totalTime / 1000)).toFixed(1) + "fps"
    output.innerHTML = errors.slice(0,200).map(errorCode).join("<br>")
}

function errorCode(e) {
    return pad(e.px, 5, true) +
        " :: " +
        pad(e.diff) +
        ": " +
        c(e.over) +
        " " +
        mode.value +
        " " +
        c(e.under) +
        " = " +
        c(e.out) +
        "; should be " +
        c(e.exp)
}

function pad(n, digits, padRight) {
    var s = ""

    digits = digits || 2

    while (digits) {
        if (n < Math.pow(10,digits--)) {
            s += " "
        }
    }

    return padRight ? n + s : s + n
}

function c(pxl) {
    return "{ r: " +
        pad(pxl.r) +
        " g: " +
        pad(pxl.g) +
        " b: " +
        pad(pxl.b) +
        " a: " +
        pad(pxl.a) +
        " }"
}

function pxl(a, i) {
    return {
        r: a[i],
        g: a[i + 1],
        b: a[i + 2],
        a: a[i + 3]
    }
}

},{"../canvas-blend":1,"by/id":3,"global/document":4,"isoblend":12}],3:[function(require,module,exports){
module.exports = byId

function byId(id) {
    return document.getElementById(id)
}

},{}],4:[function(require,module,exports){
if (typeof document !== "undefined") {
    module.exports = document
} else {
    module.exports = require("min-document")
}

},{"min-document":19}],5:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {
            var ratio, diff, r, g, b;

            if (dst_r === 1) {
                r = 1;
            } else {
                diff = 1 - dst_r;
                if (diff >= src_r) {
                    r = 0;
                } else {
                    r = 1 - (diff / src_r);
                }
            }

            if (dst_g === 1) {
                g = 1;
            } else {
                diff = 1 - dst_g;
                if (diff >= src_g) {
                    g = 0;
                } else {
                    g = 1 - (diff / src_g);
                }
            }

            if (dst_b === 1) {
                b = 1;
            } else {
                diff = 1 - dst_b;
                if (diff >= src_b) {
                    b = 0;
                } else {
                    b = 1 - (diff / src_b);
                }
            }

            out_a = (src_a + dst_a) - (src_a * dst_a);

            ratio = out_a > 0 ? src_a / out_a : 0;

            out_r = ((1 - ratio) * dst_r) + (ratio * (((1 - dst_a) * src_r) +
                        (dst_a * r)));
            out_g = ((1 - ratio) * dst_g) + (ratio * (((1 - dst_a) * src_g) +
                        (dst_a * g)));
            out_b = ((1 - ratio) * dst_b) + (ratio * (((1 - dst_a) * src_b) +
                        (dst_a * b)));
        }

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],6:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {

            out_a = (src_a + dst_a) - (src_a * dst_a);

            if (out_a > 0) {
                out_r = (((out_a - src_a) * dst_r) + (src_a * src_r)) / out_a;
                out_g = (((out_a - src_a) * dst_g) + (src_a * src_g)) / out_a;
                out_b = (((out_a - src_a) * dst_b) + (src_a * src_b)) / out_a;
            } else {
                out_r = dst_r;
                out_g = dst_g;
                out_b = dst_b;
            }
        }

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],7:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {
    var ratio;

    out_a = (src_a + dst_a) - (src_a * dst_a);

    ratio = out_a > 0 ? src_a / out_a : 0;

    out_r = ((1 - ratio) * dst_r) + (ratio * (((1 - dst_a) * src_r) +
                (dst_a * (src_r > dst_r ? dst_r : src_r))));
    out_g = ((1 - ratio) * dst_g) + (ratio * (((1 - dst_a) * src_g) +
                (dst_a * (src_g > dst_g ? dst_g : src_g))));
    out_b = ((1 - ratio) * dst_b) + (ratio * (((1 - dst_a) * src_b) +
                (dst_a * (src_b > dst_b ? dst_b : src_b))));
}

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],8:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {
    var ratio;

    out_a = (src_a + dst_a) - (src_a * dst_a);

    ratio = out_a > 0 ? src_a / out_a : 0;

    out_r = ((1 - ratio) * dst_r) + (ratio * (((1 - dst_a) * src_r) +
                (dst_a * (Math.abs(src_r - dst_r)))));
    out_g = ((1 - ratio) * dst_g) + (ratio * (((1 - dst_a) * src_g) +
                (dst_a * (Math.abs(src_g - dst_g)))));
    out_b = ((1 - ratio) * dst_b) + (ratio * (((1 - dst_a) * src_b) +
                (dst_a * (Math.abs(src_b - dst_b)))));
}

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],9:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {
    var ratio, diff, r, g, b;

    if (dst_r === 0) {
        r = 0;
    } else {
        diff = 1 - src_r;
        if (dst_r >= diff) {
            r = 1;
        } else {
            r = dst_r / diff;
        }
    }

    if (dst_g === 0) {
        g = 0;
    } else {
        diff = 1 - src_g;
        if (dst_g >= diff) {
            g = 1;
        } else {
            g = dst_g / diff;
        }
    }

    if (dst_b === 0) {
        b = 0;
    } else {
        diff = 1 - src_b;
        if (dst_b >= diff) {
            b = 1;
        } else {
            b = dst_b / diff;
        }
    }

    out_a = (src_a + dst_a) - (src_a * dst_a);

    ratio = out_a > 0 ? src_a / out_a : 0;

    out_r = ((1 - ratio) * dst_r) + (ratio * (((1 - dst_a) * src_r) +
                (dst_a * r)));
    out_g = ((1 - ratio) * dst_g) + (ratio * (((1 - dst_a) * src_g) +
                (dst_a * g)));
    out_b = ((1 - ratio) * dst_b) + (ratio * (((1 - dst_a) * src_b) +
                (dst_a * b)));
}

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],10:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {
    var ratio;

    out_a = (src_a + dst_a) - (src_a * dst_a);

    ratio = out_a > 0 ? src_a / out_a : 0;

    out_r = ((1 - ratio) * dst_r) + (ratio * (((1 - dst_a) * src_r) +
                (dst_a * ((dst_r + src_r) - (2 * dst_r * src_r)))));
    out_g = ((1 - ratio) * dst_g) + (ratio * (((1 - dst_a) * src_g) +
                (dst_a * ((dst_g + src_g) - (2 * dst_g * src_g)))));
    out_b = ((1 - ratio) * dst_b) + (ratio * (((1 - dst_a) * src_b) +
                (dst_a * ((dst_b + src_b) - (2 * dst_b * src_b)))));
}

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],11:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {
    var ratio, r, g, b;

    if (src_r <= 0.5) {
        r = dst_r * 2 * src_r;
    } else {
        r = 1 - ((1 - dst_r) * (1 - ((2 * src_r) - 1)));
    }

    if (src_g <= 0.5) {
        g = dst_g * 2 * src_g;
    } else {
        g = 1 - ((1 - dst_g) * (1 - ((2 * src_g) - 1)));
    }

    if (src_b <= 0.5) {
        b = dst_b * 2 * src_b;
    } else {
        b = 1 - ((1 - dst_b) * (1 - ((2 * src_b) -1)));
    }

    out_a = (src_a + dst_a) - (src_a * dst_a);

    ratio = out_a > 0 ? src_a / out_a : 0;

    out_r = ((1 - ratio) * dst_r) + (ratio * (((1 - dst_a) * src_r) +
                (dst_a * r)));
    out_g = ((1 - ratio) * dst_g) + (ratio * (((1 - dst_a) * src_g) +
                (dst_a * g)));
    out_b = ((1 - ratio) * dst_b) + (ratio * (((1 - dst_a) * src_b) +
                (dst_a * b)));
}

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],12:[function(require,module,exports){
var burn = require("./burn")
var compatible = require("./compatible")
var darken = require("./darken")
var difference = require("./difference")
var dodge = require("./dodge")
var exclusion = require("./exclusion")
var hardlight = require("./hardlight")
var lighten = require("./lighten")
var multiply = require("./multiply")
var normal = require("./normal")
var overlay = require("./overlay")
var screen = require("./screen")
var softlight = require("./softlight")

module.exports = {
    burn: burn,
    compatible: compatible,
    darken: darken,
    difference: difference,
    dodge: dodge,
    exclusion: exclusion,
    hardlight: hardlight,
    lighten: lighten,
    multiply: multiply,
    normal: normal,
    overlay: overlay,
    screen: screen,
    softlight: softlight
}

},{"./burn":5,"./compatible":6,"./darken":7,"./difference":8,"./dodge":9,"./exclusion":10,"./hardlight":11,"./lighten":13,"./multiply":14,"./normal":15,"./overlay":16,"./screen":17,"./softlight":18}],13:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {
    var ratio;

    out_a = (src_a + dst_a) - (src_a * dst_a);

    ratio = out_a > 0 ? src_a / out_a : 0;

    out_r = ((1 - ratio) * dst_r) + (ratio * (((1 - dst_a) * src_r) +
                (dst_a * (src_r > dst_r ? src_r : dst_r))));
    out_g = ((1 - ratio) * dst_g) + (ratio * (((1 - dst_a) * src_g) +
                (dst_a * (src_g > dst_g ? src_g : dst_g))));
    out_b = ((1 - ratio) * dst_b) + (ratio * (((1 - dst_a) * src_b) +
                (dst_a * (src_b > dst_b ? src_b : dst_b))));
}

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],14:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {
    var ratio;

    out_a = (src_a + dst_a) - (src_a * dst_a);

    ratio = out_a > 0 ? src_a / out_a : 0;

    out_r = ((1 - ratio) * dst_r) + (ratio * (((1 - dst_a) * src_r) +
                (dst_a * (src_r * dst_r))));
    out_g = ((1 - ratio) * dst_g) + (ratio * (((1 - dst_a) * src_g) +
                (dst_a * (src_g * dst_g))));
    out_b = ((1 - ratio) * dst_b) + (ratio * (((1 - dst_a) * src_b) +
                (dst_a * (src_b * dst_b))));
}

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],15:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {

    out_a = (src_a + dst_a) - (src_a * dst_a);

    if (out_a > 0) {
        out_r = (((out_a - src_a) * dst_r) + (src_a * src_r)) / out_a;
        out_g = (((out_a - src_a) * dst_g) + (src_a * src_g)) / out_a;
        out_b = (((out_a - src_a) * dst_b) + (src_a * src_b)) / out_a;
    } else {
        out_r = dst_r;
        out_g = dst_g;
        out_b = dst_b;
    }
}

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],16:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {
            var ratio, r, g, b;

            if (dst_r <= 0.5) {
                r = src_r * 2 * dst_r;
            } else {
                r = 1 - ((1 - src_r) * (1 - ((2 * dst_r) - 1)));
            }

            if (dst_g <= 0.5) {
                g = src_g * 2 * dst_g;
            } else {
                g = 1 - ((1 - src_g) * (1 - ((2 * dst_g) - 1)));
            }

            if (dst_b <= 0.5) {
                b = src_b * 2 * dst_b;
            } else {
                b = 1 - ((1 - src_b) * (1 - ((2 * dst_b) -1)));
            }

            out_a = (dst_a + src_a) - (dst_a * src_a);

            ratio = out_a > 0 ? dst_a / out_a : 0;

            out_r = ((1 - ratio) * src_r) + (ratio * (((1 - src_a) * dst_r) +
                        (src_a * r)));
            out_g = ((1 - ratio) * src_g) + (ratio * (((1 - src_a) * dst_g) +
                        (src_a * g)));
            out_b = ((1 - ratio) * src_b) + (ratio * (((1 - src_a) * dst_b) +
                        (src_a * b)));
        }

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],17:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {
    var ratio;

    out_a = (src_a + dst_a) - (src_a * dst_a);

    ratio = out_a > 0 ? src_a / out_a : 0;

    out_r = ((1 - ratio) * dst_r) + (ratio * (((1 - dst_a) * src_r) +
                (dst_a * ((src_r + dst_r) - (src_r * dst_r)))));
    out_g = ((1 - ratio) * dst_g) + (ratio * (((1 - dst_a) * src_g) +
                (dst_a * ((src_g + dst_g) - (src_g * dst_g)))));
    out_b = ((1 - ratio) * dst_b) + (ratio * (((1 - dst_a) * src_b) +
                (dst_a * ((src_b + dst_b) - (src_b * dst_b)))));
}

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],18:[function(require,module,exports){
module.exports = function blendSurface(srcSurface, dstSurface, outSurface, shaderFunction) {
    var len = dstSurface.length,
        src_r, src_g, src_b, src_a,
        dst_r, dst_g, dst_b, dst_a,
        out_r, out_g, out_b, out_a,
        px;

    for (px = 0; px < len; px += 4) {
        src_r = srcSurface[px] / 255;
        src_g = srcSurface[px + 1] / 255;
        src_b = srcSurface[px + 2] / 255;
        src_a = srcSurface[px + 3] / 255

        dst_r = dstSurface[px] / 255;
        dst_g = dstSurface[px + 1] / 255;
        dst_b = dstSurface[px + 2] / 255;
        dst_a = dstSurface[px + 3] / 255;

        {
    var ratio, r, g, b;


    if (src_r < 0.5) {
        r =  2 * dst_r * src_r + (dst_r * dst_r) * (1 - 2 * src_r)
    } else {
        r = 2 * dst_r * (1 - src_r) + Math.sqrt(dst_r)*(2 * src_r - 1)
    }

    if (src_g < 0.5) {
        g =  2 * dst_g * src_g + (dst_g * dst_g) * (1 - 2 * src_g)
    } else {
        g = 2 * dst_g * (1 - src_g) + Math.sqrt(dst_g)*(2 * src_g - 1)
    }

    if (src_b < 0.5) {
        b =  2 * dst_b * src_b + (dst_b * dst_b) * (1 - 2 * src_b)
    } else {
        b = 2 * dst_b * (1 - src_b) + Math.sqrt(dst_b)*(2 * src_b - 1)
    }

    out_a = (src_a + dst_a) - (src_a * dst_a);

    ratio = out_a > 0 ? src_a / out_a : 0;

    out_r =  ((1 - ratio) * dst_r) + (ratio * (((1 - dst_a) * src_r) +
                (dst_a * r)));
    out_g = ((1 - ratio) * dst_g) + (ratio * (((1 - dst_a) * src_g) +
                (dst_a * g)));
    out_b = ((1 - ratio) * dst_b) + (ratio * (((1 - dst_a) * src_b) +
                (dst_a * b)));
}

        outSurface[px] = out_r * 255;
        outSurface[px + 1] = out_g * 255;
        outSurface[px + 2] = out_b * 255;
        outSurface[px + 3] = out_a * 255;
    }
}

},{}],19:[function(require,module,exports){

},{}]},{},[2])