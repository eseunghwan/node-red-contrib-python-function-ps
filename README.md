
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
[{"id":"46afb12302147921","type":"tab","label":"플로우 1","disabled":false,"info":"","env":[]},{"id":"3e5155713d1f9165","type":"inject","z":"46afb12302147921","name":"","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":180,"y":80,"wires":[["37032636c9ca02b3"]]},{"id":"c723493c8a9d8157","type":"debug","z":"46afb12302147921","name":"debug 1","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":880,"y":80,"wires":[]},{"id":"c0d9108b943eedd5","type":"http in","z":"46afb12302147921","name":"","url":"/api_test","method":"get","upload":false,"swaggerDoc":"","x":170,"y":220,"wires":[["37032636c9ca02b3"]]},{"id":"af4c72cbc5d13b65","type":"http response","z":"46afb12302147921","name":"","statusCode":"","headers":{},"x":870,"y":220,"wires":[]},{"id":"37032636c9ca02b3","type":"python-function-ps","z":"46afb12302147921","name":"","pythonPathType":"local","pythonPath":"/Users/shlee-d-1-nb/Desktop/node-red standalone/.node-red/env/bin/python","globalPythonName":"pythonPath","importPathList":[],"fnCode":"\nimport pandas as pd\n\nmsg[\"payload\"] = pd.read_json(\n    \"https://jsonplaceholder.typicode.com/posts\"\n).to_dict(orient = \"records\")\n\nfor i in range(5):\n    print(i)\n\nreturn msg\n","x":490,"y":160,"wires":[["c723493c8a9d8157","244c7fb1eaf214c2"]]},{"id":"208c1f92b8ae2eb2","type":"inject","z":"46afb12302147921","name":"","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":160,"y":380,"wires":[["495d7f30aca797d4"]]},{"id":"495d7f30aca797d4","type":"python-function-ps","z":"46afb12302147921","name":"","pythonPathType":"local","pythonPath":"python3","globalPythonName":"","importPathList":[],"fnCode":"\nimport sys\nfrom PySide6.QtWidgets import QApplication, QMainWindow\n\n\nclass MyWindow(QMainWindow):\n    def __init__(self):\n        super().__init__()\n\n        self.resize(300, 300)\n        self.setWindowTitle(\"node-red-pyside6-check\")\n\n    def closeEvent(self, ev):\n        msg[\"payload\"] = \"12341234\"\n\n        super().closeEvent(ev)\n\napp = QApplication(sys.argv)\nwin = MyWindow()\nwin.show()\n\napp.exec()\n\n\nreturn msg\n","x":490,"y":380,"wires":[["21b4de53927aa921"]]},{"id":"21b4de53927aa921","type":"debug","z":"46afb12302147921","name":"debug 2","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","statusVal":"","statusType":"auto","x":880,"y":380,"wires":[]},{"id":"244c7fb1eaf214c2","type":"switch","z":"46afb12302147921","name":"","property":"req","propertyType":"msg","rules":[{"t":"nempty"}],"checkall":"true","repair":false,"outputs":1,"x":710,"y":200,"wires":[["af4c72cbc5d13b65"]]}]
```

<br>

## Todos
[x] Support for 'node.log', 'node.error' functions.

[x] Support 'global' object for python.

[x] Support for 'additional import paths'.

[ ] More intuitive stacktrace.
