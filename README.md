
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
npm install node-red-contrib-python-function-ps
```

<br>

## Usage
Like function node, write python code instead javascript code and run.

<br>

## Example Flow
```json
[{"id":"46afb12302147921","type":"tab","label":"플로우 1","disabled":false,"info":"","env":[]},{"id":"3e5155713d1f9165","type":"inject","z":"46afb12302147921","name":"","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"07 16 * * *","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":190,"y":80,"wires":[["37032636c9ca02b3"]]},{"id":"c723493c8a9d8157","type":"debug","z":"46afb12302147921","name":"debug 1","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":840,"y":80,"wires":[]},{"id":"c0d9108b943eedd5","type":"http in","z":"46afb12302147921","name":"","url":"/api_test","method":"get","upload":false,"swaggerDoc":"","x":170,"y":220,"wires":[["37032636c9ca02b3"]]},{"id":"af4c72cbc5d13b65","type":"http response","z":"46afb12302147921","name":"","statusCode":"","headers":{},"x":850,"y":220,"wires":[]},{"id":"37032636c9ca02b3","type":"python-function-ps","z":"46afb12302147921","name":"","pythonPathType":"local","pythonPath":"/Users/shlee-d-1-nb/Desktop/node-red standalone/.node-red/env/bin/python","globalPythonName":"pythonPath","importPathList":[],"fnCode":"\nimport pandas as pd\n\nmsg[\"payload\"] = pd.read_json(\n    \"https://jsonplaceholder.typicode.com/posts\"\n).to_dict(orient = \"records\")\n\nfor i in range(5):\n    print(i)\n\nreturn msg\n","outputs":1,"x":490,"y":160,"wires":[["c723493c8a9d8157","af4c72cbc5d13b65"]]}]
```

<br>

## Todos
[x] Support for 'node.log', 'node.error' functions.

[x] Support 'global' object for python.

[x] Support for 'additional import paths'.

[ ] More intuitive stacktrace.
