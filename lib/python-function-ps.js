
const { PythonShell } = require("python-shell"),
strftime = require("strftime"),
path = require("path"), fs = require("fs");


var cache = {}, scriptDir = path.join(__dirname, ".scripts");;
var fnCode = `
# -*- coding: utf-8 -*-
import sys, json, traceback


_message_id = ""

class node:
    @staticmethod
    def log(*args):
        print(json.dumps({
            "_msgid": _message_id,
            "type": "log", "payload": args
        }))

    @staticmethod
    def warn(*args):
        print(json.dumps({
            "_msgid": _message_id,
            "type": "warn", "payload": args
        }))

    @staticmethod
    def error(*args):
        print(json.dumps({
            "_msgid": _message_id,
            "type": "error", "payload": args
        }))

    @staticmethod
    def status(info:dict):
        print(json.dumps({
            "_msgid": _message_id,
            "type": "status", "payload": info
        }))

def python_function(msg:dict) -> dict:
{$fnCode}

for line in sys.stdin:
    req = json.loads(line)
    _message_id = req["_msgid"]

    try:
        result = python_function(req)
        result["type"] = "result"

        print(json.dumps(result))
    except:
        node.error(traceback.format_exc())
`;

function createShell(node, config) {
    // create script code
    fs.writeFileSync(
        node.scriptFile,
        fnCode.replace(
            "{$fnCode}",
            config.func.trim().split("\n").map(
                (line) => line == "" ? "" : `${Array(5).join(" ")}${line}`
            ).join("\n")
        )
    );

    // create python-shell object
    var shell = new PythonShell(node.scriptFile, { pythonPath: config.pythonPath, pythonOptions: ["-u"], mode: "json" });
    shell.on("message", (message) => {
        var messageType = message.type;
        delete message.type;

        if (messageType == "result") {
            // sendToNode(node, message._msgid, message);

            // restore req, res if exists
            if (cache.req != undefined) {
                message.req = cache.req;
            }
            if (cache.res != undefined) {
                message.res = cache.res;
            }
            cache = {};
            
            node.send(message);
            node.status({ fill: "green", shape: "dot", text: "Finished" });
        }
        else if (messageType == "log") {
            node.log(...message.payload);
        }
        else if (messageType == "warn") {
            node.warn(...message.payload);
            node.status({ fill: "yellow", shape: "dot", text: "Warning, see debug panel" });
        }
        else if (messageType == "error") {
            node.error(...message.payload);
            node.status({ fill: "red", shape: "dot", text: "Stopped, see debug panel" });
        }
        else if (messageType == "status") {
            node.status(message.payload);
        }
    });
    shell.on("stderr", (err) => {
        node.status({ fill: "red", shape: "dot", text: "Stopped, see debug panel" });
        node.error(err);
    });

    // change state to ready
    node.status({ fill: "blue", shape: "dot", text: "Ready" });

    // map shell
    node.shell = shell;
}

module.exports = function (RED) {
    // node object function
    function fnNode(config) {
        var node = this;
        RED.nodes.createNode(node, config);

        // create scriptir if not exists
        if (!fs.existsSync(scriptDir)) {
            fs.mkdirSync(scriptDir);
        }

        node.scriptFile = path.join(
            scriptDir,
            config.name == "" ? `${strftime("%Y-%m-%d-%H-%M-%S")}.py` : `${node.name}.py`
        );
        if (config.name != "" && fs.existsSync(node.scriptFile)) {
            node.scriptFile = path.join(scriptDir, `${node.name}-${strftime("%Y-%m-%d-%H-%M-%S")}.py`);
        }

        createShell(node, config);

        node.on("input", (message) => {
            // store req, res if exists
            if (message.req != undefined) {
                cache.req = message.req;
            }
            if (message.res != undefined) {
                cache.res = message.res;
            }

            node.shell.send({
                "_msgid": message._msgid,
                payload: message.payload, topic: message.topic
            });
            if (fs.existsSync(node.scriptFile)) {
                fs.unlinkSync(node.scriptFile);
            }

            node.status({ fill: "green", shape: "dot", text: "Running" });
        });
        node.on("close", function () {
            node.shell.kill();
            node.shell = null;

            if (fs.existsSync(scriptFile)) {
                fs.unlinkSync(scriptFile);
            }
        });
    }

    // register node
    RED.nodes.registerType("python-function-ps", fnNode);
};
