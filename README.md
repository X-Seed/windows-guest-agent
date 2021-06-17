# XSeed guest agent (Windows)
- Runs at the host PC to provides automation for XSeed gaming service.

# Dependencies
- AutoHotKey to compile the .ahk file to .exe 
- Node

# Usage 
- use autoHotKey to compile the .ahk code to .exe 
- Node `pkg` package to compile .js code to windows .exe 
```
npm run buildWindows
```
- Open Run (Windows + R), and type `shell:startup` to open the start up folder
- Place a shortcut of the compiled .exe in the startup folder

# TODO 
- Integrate with AHK using node-ahk, so as to remove the .ahk script 
- Auto open firewall
- Currently assuming PC has IPv6. Maybe supports IPv4 soon? 