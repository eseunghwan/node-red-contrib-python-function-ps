
const { PythonShell } = require("python-shell"),
strftime = require("strftime"),
path = require("path"), fs = require("fs");


var fnCode = `
# -*- coding: utf-8 -*-
import sys, json


def python_function(msg:dict) -> dict:
{$fnCode}

for line in sys.stdin:
    print(json.dumps(python_function(json.loads(line))))
`;
var scriptDir = path.join(__dirname, "scripts");

function sendResults(node, messageId, messages) {
    if (messages == null) {
        return;
    } else if (!Array.isArray(messages)) {
        messages = [messages];
    }

    var message_count = 0;
    for (var m = 0; m < messages.length; m++) {
        if (messages[m]) {
            if (Array.isArray(messages[m])) {
                for (var n = 0; n < messages[m].length; n++) {
                    messages[m][n]._msgid = messageId;
                    message_count++;
                }
            } else {
                messages[m]._msgid = messageId;
                message_count++;
            }
        }
    }

    if (message_count > 0) {
        // restore req, res if exists
        if (node.req !== undefined){
            messages[0].req = node.req;
        }
        if (node.res !== undefined){
            messages[0].res = node.res;
        }
        node.send(messages);
    }
}

function createShell(node, config) {
    fs.writeFileSync(
        node.scriptFile,
        fnCode.replace("{$fnCode}", config.func.split("\n").map((line) => line == "" ? "" : `${Array(5).join(" ")}${line}`).join("\n"))
    );
    var shell = new PythonShell(node.scriptFile, { pythonPath: config.pythonPath, pythonOptions: [ "-u" ], mode: "json" });
    shell.on("message", (message) => {
        sendResults(node, message._msgid, message);
        node.status({ fill: "green", shape: "dot", text: "Finished" });
    });
    shell.on("stderr", (err) => {
        node.status({ fill: "red", shape: "dot", text: "Stopped, see debug panel" });
        node.error(err);
    });

    node.status({ fill: "blue", shape: "dot", text: "Ready" });
    node.shell = shell;
}

module.exports = function(RED) {
    function fnNode(config) {
        var node = this;
        RED.nodes.createNode(node, config);

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
            // store payload, req, res if exists
            if (message.payload !== undefined) {
                node.payload = message.payload;
            }
            if (message.req !== undefined){
                node.req = message.req;
            }
            if (message.res !== undefined){
                node.res = message.res;
            }

            var cache = [], inputMessage = {};
            for (var key in message) {
                var value = message[key];
                if (typeof(value) == "object" && value != null) {
                    if (key != "payload" && cache.indexOf(value) != -1) {
                        return;
                    }

                    cache.push(value);
                }

                inputMessage[key] = value;
            }
            cache = null;

            node.shell.send(inputMessage);
            node.status({ fill: "yellow", shape: "dot", text: "Running" });
        });
        node.on("close", function () {
            node.shell.kill();
            node.shell = null;

            if (fs.existsSync(scriptFile)) {
                fs.unlinkSync(scriptFile);
            }
        });
    }

    RED.nodes.registerType("python-function-ps", fnNode);
};
