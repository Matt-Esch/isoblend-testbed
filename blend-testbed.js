var byId = require("by/id")
var console = require("global/console")
var document = require("global/document")
var isoblend = require("isoblend")
var canvasBlend = require("../canvas-blend")

var data = {}, contexts = {}, size

var body = document.body
var bg = byId("bg")
var mode = byId("mode")
var source = byId("source")
var under = byId("under")
var over = byId("over")
var out = byId("out")
var ref = byId("ref")

bg.onchange = updateBG;
mode.onchange = blend;
source.onchange = changeSources;

updateBG();
changeSources();

function updateBG() {
    body.style.backgroundImage = "url(images/bg-" + bg.value + ".png)";
    body.className = bg.item(bg.selectedIndex).className;
    console.log(body.className);
}

function changeSources() {
    var sourceCount = 0

    contexts = {}
    data = {}

    under.onload = function () {
        sourceCount += 1;
        onSourcesChanged("under", this.width, this.height, sourceCount);
    }

    over.onload = function () {
        sourceCount += 1;
        onSourcesChanged("over", this.width, this.height, sourceCount);
    }

    under.src = "images/under" + source.selectedIndex + ".png";
    over.src = "images/over" + source.selectedIndex + ".png";
}

function onSourcesChanged(name, width, height, sourceCount) {
    createContext(name, width, height)

    // Both images have loaded
    if (sourceCount === 2) {
        size = { width: over.width, height: over.height }
        contexts.ref = ref.getContext("2d")
        contexts.out = out.getContext("2d")
        blend()
    }
}

function createContext(name, width, height) {
    var canvas = document.createElement("canvas")
    var ctx

    canvas.width = width
    canvas.height = height

    ctx = contexts[name] = document.createElement("canvas").getContext("2d")

    drawImage(ctx, name)
    data[name] = ctx.getImageData(0, 0, width, height).data
}

function drawImage(ctx, imgOrId) {
    if (typeof imgOrId === "string") {
        ctx.drawImage(byId(imgOrId), 0, 0);
    }else{
        ctx.drawImage(imgOrId, 0, 0);
    }
}
function blend() {
    var ref = new Image();
    ref.onload = doWork;
    ref.src = "images/multi" + source.value + "_" + mode.value.toLowerCase() + ".png";
}

function doWork() {
    var iterations = 50,
        totalTime  = 0,
        i;

    contexts.ref.canvas.width = size.width;
    contexts.ref.canvas.height = size.height;

    // Since Safari sometimes does not fully clear a resized canvas
    contexts.ref.clearRect(0, 0, contexts.ref.canvas.width, contexts.ref.canvas.height);
    drawImage(contexts.ref, this);
    for (i = 0; i < iterations; i += 1) {
        contexts.out.canvas.width = size.width;
        contexts.out.canvas.height = size.height;
        drawImage(contexts.out, 'under');
        var t = new Date;
        canvasBlend(isoblend[mode.value],contexts.over, contexts.out, contexts.out, { outX: 500, outY: 500 });
        totalTime += (new Date) - t;
    }
    calculateStatistics(mode.value,iterations,totalTime);
}

function pad(n, digits, padRight) {
    if (!digits) digits = 2;
    var s = "";
    while (digits) if (n < Math.pow(10,digits--)) s += " ";
    return padRight ? n+s : s+n;
}

function c(pxl) {
    return '{r:'+pad(pxl.r)+' g:'+pad(pxl.g)+' b:'+pad(pxl.b)+' a:'+pad(pxl.a)+'}';
}

function pxl(a,i) {
    return {r:a[i],g:a[i+1],b:a[i+2],a:a[i+3]};
}

function calculateStatistics(mode, iterations, totalTime) {
    var ref = contexts.ref.getImageData(0,0,size.width,size.height).data;
    var out = contexts.out.getImageData(0,0,size.width,size.height).data;
    var error=0,errors=[];
    var px = 0;
    for (var y=0;y<size.height;++y){
        for (var x=0;x<size.width;++x){
            var op = pxl(out,px);
            var rp = pxl(ref,px);
            var diff=0;
            var diffs = [Math.abs(op.r-rp.r), Math.abs(op.g-rp.g), Math.abs(op.b-rp.b), Math.abs(op.a-rp.a)];
            for (var i=0;i<4;++i){
                if (diffs[i]>3) diff+=diffs[i];
            }
            if (diff!=0){
                errors.push({px:px,over:pxl(data.over,px),under:pxl(data.under,px),out:op,ref:rp,diff:diff});
                error += diff*diff;
            }
            px += 4;
        }
    }
    error = Math.sqrt(error/(size.width*size.height));
    errors.sort(function(a,b){a=a.diff;b=b.diff;return a<b?1:a>b?-1:0});
    document.getElementById('total').innerHTML = (size.width*size.height);
    document.getElementById('wrong').innerHTML = (errors.length + " ("+(100*errors.length/(size.width*size.height)).toFixed(0)+"%)");
    document.getElementById('stddev').innerHTML = (error.toFixed(3));
    document.getElementById('perf').innerHTML = ((iterations/(totalTime/1000)).toFixed(1)+'fps');

    setTimeout(function(){
        document.getElementById('output').innerHTML = (errors.slice(0,200).map(function(e){
            return pad(e.px,5,true)+" :: "+pad(e.diff)+": "+c(e.over)+" "+mode+" "+c(e.under)+" = "+c(e.out)+"; should be "+c(e.ref);
        }).join("<br>"));
    },50);
}
