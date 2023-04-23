
const { PythonShell } = require("python-shell"),
path = require("path"), fs = require("fs");


var messageCache = {}, scriptDir = path.join(__dirname, ".scripts"), tempDir = path.join(__dirname, ".temp");
// create tempDir if not exists
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

var fnCode = `
# -*- coding: utf-8 -*-
import os, sys, json, traceback
import pickle


def read_input(name:str) -> object:
    with open(os.path.join("${tempDir}", name), "rb") as rif:
        value = pickle.load(rif)

    return value

def write_output(name:str, value:object):
    with open(os.path.join("${tempDir}", name), "wb") as wof:
        pickle.dump(value, wof)


class Node:
    class NodeGlobals:
        def __init__(self, node_globals:dict):
            self.__globals = node_globals
            self.__del_keys = []

        def __getitem__(self, key:str):
            if key in self.__globals.keys():
                return self.__globals[key]
            else:
                return None

        def __setitem__(self, key:str, value:object):
            self.__globals[key] = value

        def __delitem__(self, key:str):
            self.__del_keys.append(key)
            self.__globals.pop(key, None)

        def keys(self):
            return self.__globals.keys()

        def values(self):
            return self.__globals.values()

        def items(self):
            return self.__globals.items()

        def pop(self, key:str):
            self.__delitem__(key)

        def as_dict(self) -> dict:
            return {
                "globals": self.__globals,
                "del_keys": self.__del_keys
            }

    def __init__(self, message_id:str, node_globals:dict):
        self.__message_id = message_id
        self.__globals_obj = Node.NodeGlobals(node_globals)

    @property
    def globals(self) -> "Node.NodeGlobals":
        return self.__globals_obj

    def log(self, *args):
        print(json.dumps({
            "_msgid": self.__message_id,
            "$type": "log", "payload": args
        }))

    def warn(self, *args):
        print(json.dumps({
            "_msgid": self.__message_id,
            "$type": "warn", "payload": args
        }))

    def error(self, *args):
        print(json.dumps({
            "_msgid": self.__message_id,
            "$type": "error", "payload": args
        }))

    def send(self, *args):
        raise NotImplementedError("node.send is not implemented!")

    def status(self, info:dict):
        print(json.dumps({
            "_msgid": self.__message_id,
            "$type": "status", "payload": info
        }))

def python_function(msg:dict) -> dict:
{$fnCode}


default_sys_path = sys.path

for line in sys.stdin:
    req = json.loads(line)

    sys.path = default_sys_path
    for import_path in req.pop("import_path_list"):
        sys.path.append(import_path)

    node = Node(req["_msgid"], req.pop("node_globals"))

    try:
        result = python_function(req)
        result["$type"] = "result"
        result["node_globals"] = node.globals.as_dict()

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
        pythonPath: config.pythonPathType == "global" ? node.context().global[config.globalPythonName] : config.pythonPath,
        pythonOptions: ["-u"], mode: "json"
    });
    shell.on("message", (message) => {
        if (typeof message != "object" || !message.hasOwnProperty("$type")) {
            console.log(`message of ${node.type}[${node.id}] : ${message}`);
        }
        else {
            var messageType = message["$type"];
            delete message["$type"];

            if (message.node_globals != undefined) {
                var node_ctx = node.context()
                for (var key in message.node_globals.globals) {
                    node_ctx.global.set(key, message.node_globals.globals[key]);
                }
                for (var key of message.node_globals.del_keys) {
                    node_ctx.global.set(key, undefined);
                }
                delete message.node_globals
            }

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

                shell.kill();
                delete node.shell;

                if (fs.existsSync(node.scriptFile)) {
                    fs.unlinkSync(node.scriptFile);
                }

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

                shell.kill();
                delete node.shell;

                if (fs.existsSync(node.scriptFile)) {
                    fs.unlinkSync(node.scriptFile);
                }
            }
            else if (messageType == "status") {
                node.status(message.payload);
            }
        }
    });
    shell.on("stderr", (err) => {
        node.status({ fill: "red", shape: "dot", text: "Stopped, see debug panel" });
        node.error(err);
    });

    // map shell
    node.shell = shell;
}

module.exports = function (RED) {
    // node object function
    function fnNode(config) {
        var node = this; RED.nodes.createNode(node, config);

        // change state to ready
        node.status({ fill: "blue", shape: "dot", text: "Ready" });

        node.scriptFile = path.join(
            scriptDir,
            config.name == "" ? `${node.id}.py` : `${node.name}.py`
        );
        if (config.name != "" && fs.existsSync(node.scriptFile)) {
            node.scriptFile = path.join(scriptDir, `${node.name}-${node.id}.py`);
        }

        // create scriptDir if not exists
        if (!fs.existsSync(scriptDir)) {
            fs.mkdirSync(scriptDir);
        }

        node.on("input", (message) => {
            // store req, res if exists
            if (message.req != undefined) {
                messageCache.req = message.req;
            }
            if (message.res != undefined) {
                messageCache.res = message.res;
            }

            createShell(node, config);

            // remove circular reference from global contexts
            var globalMessageCache = [];
            globalContextMsg = JSON.stringify(node.context().global, function(_, value) {
                if (typeof value == "object" && value != null) {
                    if (globalMessageCache.indexOf(value) != -1) {
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
                node_globals: JSON.parse(globalContextMsg), import_path_list: config.importPathList
            });

            node.status({ fill: "green", shape: "dot", text: "Running" });
        });
        node.on("close", function () {
            if (node.shell != undefined) {
                node.shell.kill();
                delete node.shell;
            }

            fs.rmSync(scriptDir, { recursive: true });
        });
    }

    // register node
    RED.nodes.registerType("python-function-ps", fnNode);
};
