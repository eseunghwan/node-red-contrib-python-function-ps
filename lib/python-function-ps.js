
const { PythonShell } = require("python-shell"),
strftime = require("strftime"),
path = require("path"), fs = require("fs");


var messageCache = {}, scriptDir = path.join(__dirname, ".scripts");
var fnCode = `
# -*- coding: utf-8 -*-
import sys, json, traceback


class Node:
    def __init__(self, message_id:str, node_globals:dict):
        self.__message_id = message_id
        self.__node_globals = node_globals

    @property
    def globals(self) -> dict:
        return self.__node_globals

    def log(self, *args):
        print(json.dumps({
            "_msgid": self.__message_id,
            "type": "log", "payload": args
        }))

    def warn(self, *args):
        print(json.dumps({
            "_msgid": self.__message_id,
            "type": "warn", "payload": args
        }))

    def error(self, *args):
        print(json.dumps({
            "_msgid": self.__message_id,
            "type": "error", "payload": args
        }))

    def status(self, info:dict):
        print(json.dumps({
            "_msgid": self.__message_id,
            "type": "status", "payload": info
        }))

def python_function(msg:dict) -> dict:
{$fnCode}

for line in sys.stdin:
    req = json.loads(line)

    node = Node(req["_msgid"], req.pop("node_globals"))

    try:
        result = python_function(req)
        result["type"] = "result"
        result["node_globals"] = node.globals

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
            config.fnCode.trim().split("\n").map(
                (line) => line == "" ? "" : `${Array(5).join(" ")}${line}`
            ).join("\n")
        )
    );

    // create python-shell object
    var shell = new PythonShell(node.scriptFile, {
        pythonPath: config.pythonPathType == "global" ? node.context().global[config.pythonPath] : config.pythonPath,
        pythonOptions: ["-u"], mode: "json"
    });
    shell.on("message", (message) => {
        var messageType = message.type;
        delete message.type;

        var node_ctx = node.context()
        for (var key in message.node_globals) {
            node_ctx.global.set(key, message.node_globals[key]);
        }
        delete message.node_globals

        if (messageType == "result") {
            // sendToNode(node, message._msgid, message);

            // restore req, res if exists
            if (messageCache.req != undefined) {
                message.req = messageCache.req;
                delete messageCache.req;
            }
            if (messageCache.res != undefined) {
                message.res = messageCache.res;
                delete messageCache.res;
            }
            
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

        // clear scriptDir if exists
        if (fs.existsSync(scriptDir)) {
            fs.rmSync(scriptDir, { recursive: true });
        }
        fs.mkdirSync(scriptDir);

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
                messageCache.req = message.req;
            }
            if (message.res != undefined) {
                messageCache.res = message.res;
            }

            // remove circular reference from global contexts
            var globalMessageCache = [];
            globalContextMsg = JSON.stringify(node.context().global, function(_, value) {
                if (typeof value == 'object' && value != null) {
                    if (globalMessageCache.indexOf(value) != -1) {
                        // Circular reference found, discard key
                        return;
                    }
                    // Store value in our collection
                    globalMessageCache.push(value);
                }
                return value;
            });
            globalMessageCache = null;

            node.shell.send({
                "_msgid": message._msgid,
                payload: message.payload, topic: message.topic,
                node_globals: JSON.parse(globalContextMsg)
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
