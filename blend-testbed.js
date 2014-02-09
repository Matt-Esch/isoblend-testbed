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
