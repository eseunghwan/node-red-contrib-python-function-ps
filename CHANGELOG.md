
## 0.0.1
- initial release

<br>

## 0.0.2
- Support for 'node.log', 'node.error', 'node.warn', 'node.status' functions
- deprecated for errors

<br>

## 0.0.3
- fix errors

<br>

## 0.0.4
- fix json circular structure exception.

<br>

## 0.0.5, 0.0.6
- add global context for 'Python Path'
- add example flow

<br>

## 0.0.7
- add global context to python as 'node.globals'
  - in python, global is reserved

<br>

## 0.0.8
- merge 'pythonPath' and 'globalPythonPath' as 'typedInput'
- edit html file
- add 'circular reference error' prevention code for global context

<br>

## 0.0.9
- support 'print' function in function code.
- change editor to monaco(vscode).
- displays the corresponding values based on the selection of 'local' and 'global'.
- move temp file creation from initialize to message input.
- fix bugs.

<br>

## 0.0.10
- fix bugs.
- add "Import Path".
  - before run code, add paths to "sys.path".

<br>

## 0.0.11
- split code editor and settings as tab.
- remove outputs spinner.
- add 'NotImplementedError' to node.send in python code.
