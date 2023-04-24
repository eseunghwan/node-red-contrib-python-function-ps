
<h1 align="center">
Python Function Node-RED Node using python-shell
</h1>

<br>

### supported platforms
- Windows
- Linux(tested on WSL)
- OSX(tested on M1)

<br>

### supported python versions
- Python 2.7
- Python 3.x(tested on 3.7 and above)

<hr><br><br>

## Install
install via npm or Node-RED palette manager.
```zsh
npm install node-red-contrib-python-function-ps --save
```

<br>

## Usage
Like function node, write python code instead javascript code and run.
```python
# user code here.

a = 1234

node.globals["a"] = a
del node.globals["a"]

write_output("a", a)
msg["payload"] = read_input("a")

return msg
```

<br>

## Example Flow
```json
[{"id":"382690a637ad27e8","type":"inject","z":"588e7dc76a18c895","name":"","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":140,"y":200,"wires":[["c10a056d2aa1dea0"]]},{"id":"412d6d40234f18ed","type":"debug","z":"588e7dc76a18c895","name":"debug 1","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":800,"y":200,"wires":[]},{"id":"c10a056d2aa1dea0","type":"python-function-ps","z":"588e7dc76a18c895","name":"","pythonPathType":"global","pythonPath":"python3","globalPythonName":"pythonPath","importPathList":[],"fnCodePre":"\n# user code here.\n\nreturn msg\n","fnCode":"\n# user code here.\n\nmsg[\"T\"] = { \"a\": 1, \"b\": 2 }\n\nreturn msg\n","fnCodePost":"\n# user code here.\n\nreturn msg\n","x":350,"y":200,"wires":[["651e7099d7f27af8"]]},{"id":"651e7099d7f27af8","type":"python-function-ps","z":"588e7dc76a18c895","name":"","pythonPathType":"global","pythonPath":"python3","globalPythonName":"pythonPath","importPathList":[],"fnCodePre":"\n# user code here.\n\nreturn msg\n","fnCode":"\n# user code here.\n\nmsg[\"payload\"] = msg.pop(\"T\")\n\nreturn msg\n","fnCodePost":"\n# user code here.\n\nreturn msg\n","x":590,"y":200,"wires":[["412d6d40234f18ed"]]}]
```

<br>

## Todos
[x] Support for 'node.log', 'node.error' functions.

[x] Support 'global' object for python.

[x] Support 'flow' object for python.

[x] Support for 'additional import paths'.

[ ] More intuitive stacktrace.
