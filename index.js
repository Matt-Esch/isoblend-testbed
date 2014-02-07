var console = require("console")
var http = require("http")
var st = require("st")

var PORT = 3896

http.createServer(st({
    path: __dirname,
    index: "index.html"
})).listen(PORT, log)

function log(err) {
    if (err) {
        console.error(err)
    } else {
        console.log("Server listening on port", PORT)
    }
}
