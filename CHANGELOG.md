
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

<br>

## 0.0.12
- create PS class for "read_input" and "write_output" function.
- remove unnecessary codes.
- fix pythontype typedinput

<br>

## 0.0.13
- move "read_input" and "write_output" to global funtcions
- changes of node.globals apply to node-red
- change example flow

<br>

## 0.0.14
- change pickles of "read_input" and "write_output" from tempfile to memory
- support for "req" of message(header, body, cookie only).

<br>

## 0.1.0
- automatically convert datas from message and to message.
- send/recieve all message object between node and python function.
- fix bug of "req".
- add "Code(Pre)" and "Code(Post)" code jobs.
  - "Code(Pre)" runs before main code.
  - "Code(Post)" runs after main code.
- change default width of editor form.

<br>

## 0.1.1
- remove unnecessary codes.
- add "payload" to "req"(python)
- make "Code(Pre)" and "Code(Post)" runs in same function with "Code".
  - can use variables defined from "Code(Pre)" in "Code" and "Code(Post)"
