
const { PythonShell } = require("python-shell"),
path = require("path"), fs = require("fs");


var messageCache = {}, scriptDir = path.join(__dirname, ".scripts");
var io_datas = {};
var fnCode = `
# -*- coding: utf-8 -*-
import os, sys, json, traceback
import pickle, codecs


def read_input(name:str, default:object = None) -> object:
    if name in io_datas.keys():
        return pickle.loads(codecs.decode(io_datas[name].encode(), "base64"))
    else:
        return default

def write_output(name:str, value:object):
    io_datas[name] = codecs.encode(pickle.dumps(value), "base64").decode()


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

def python_function_pre(msg:dict) -> dict:
    loaded_msg = {}
    for key, value in msg.items():
        if isinstance(value, str) and value.startswith("$python-function-ps:"):
            loaded_msg[key] = pickle.loads(codecs.decode(value[20:].encode(), "base64"))

    msg.update(loaded_msg)
    del loaded_msg

    return msg

def python_function(msg:dict) -> dict:
{$fnCodePre}

{$fnCode}

def python_function_post(msg:dict) -> dict:
    dumped_msg = {}
    for key, value in msg.items():
        if not isinstance(value, (int, float, bool, str, list, dict)):
            dumped_msg[key] = "$python-function-ps:" + codecs.encode(pickle.dumps(value), "base64").decode()

    msg.update(dumped_msg)
    del dumped_msg

    return msg


default_sys_path = sys.path

for line in sys.stdin:
    req = json.loads(line)

    sys.path = default_sys_path
    for import_path in req.pop("import_path_list"):
        sys.path.append(import_path)

    node = Node(req["_msgid"], req.pop("node_globals"))
    io_datas = req.pop("io_datas")

    try:
        result = python_function_pre(req)
        result = python_function(result)
        result = python_function_post(result)

        result["$type"] = "result"
        result["node_globals"] = node.globals.as_dict()
        result["io_datas"] = io_datas

        print(json.dumps(result))
    except:
        node.error(traceback.format_exc())
`;

function createShell(node, config) {
    // create script code
    fs.writeFileSync(
        node.scriptFile,
        fnCode.replace(
            "{$fnCodePre}",
            config.fnCodePre.trim().split("\n").map(
                (line) => line == "" ? "" : `${Array(5).join(" ")}${line}`
            ).join("\n")
        ).replace(
            "{$fnCode}",
            config.fnCode.trim().split("\n").map(
                (line) => line == "" ? "" : `${Array(5).join(" ")}${line}`
            ).join("\n").replace(
                `${Array(5).join(" ")}return msg`,
                "\n" + config.fnCodePost.trim().split("\n").map(
                    (line) => line == "" ? "" : `${Array(5).join(" ")}${line}`
                ).join("\n") + `\n${Array(5).join(" ")}return msg`
            )
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
                var global_ctx = node.context().global;
                for (var key in message.node_globals.globals) {
                    global_ctx.set(key, message.node_globals.globals[key]);
                }
                for (var key of message.node_globals.del_keys) {
                    global_ctx.set(key, undefined);
                }
                delete message.node_globals
            }
            
            if (message.io_datas != undefined) {
                for (var key in message.io_datas) {
                    io_datas[key] = message.io_datas[key];
                }

                delete message.io_datas;
            }

            if (messageType == "result") {
                // sendToNode(node, message._msgid, message);

                // restore req, res if exists
                if (messageCache.req != undefined) {
                    for (var key in messageCache.req) {
                        message.req[key] = messageCache.req[key];
                    }
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
            // store res, req if exists
            var reqToSend = null;
            if (message.req != undefined && typeof(message.req) == "object") {
                messageCache.req = message.req;

                reqToSend = {};
                reqToSend["payload"] = message.req.payload;
                reqToSend["body"] = message.req.body
                reqToSend["cookie"] = message.req.cookie
                reqToSend["header"] = {};
                for (var idx = 0; idx < message.req.rawHeaders.length / 2; idx++) {
                    reqToSend["header"][message.req.rawHeaders[idx * 2]] = message.req.rawHeaders[idx * 2 + 1];
                }

                delete message.req;
            }
            if (message.res != undefined && typeof(message.res) == "object") {
                messageCache.res = message.res;
                delete message.res;
            }

            createShell(node, config);

            // remove circular reference from global contexts
            var globalMessageCache = [];
            var globalContextMsg = JSON.stringify(node.context().global, function(_, value) {
                if (typeof value == "object" && value != null) {
                    if (globalMessageCache.indexOf(value) != -1) {
                        return;
                    }
                    // store value to cache
                    globalMessageCache.push(value);
                }

                return value;
            });
            globalMessageCache = null;

            message["node_globals"] = JSON.parse(globalContextMsg);
            message["io_datas"] = io_datas;
            message["import_path_list"] = config.importPathList;
            if (reqToSend != null) {
                message["req"] = reqToSend;
            }
            node.shell.send(message);

            node.status({ fill: "green", shape: "dot", text: "Running" });
        });
        node.on("close", function () {
            if (node.shell != undefined) {
                node.shell.kill();
                delete node.shell;
            }
        });
    }

    // clear scriptDir, tempDir
    if (fs.existsSync(scriptDir)) {
        fs.rmSync(scriptDir, { recursive: true });
    }
    fs.mkdirSync(scriptDir);

    // register node
    RED.nodes.registerType("python-function-ps", fnNode);
};
