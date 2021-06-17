const express = require("express");
const app = express()
const port = 1704
const {exec} = require("child_process")
const fs = require('fs')
const axios = require('axios')
const ipv6 = require('./ipv6')

app.get("/gameStreamAutoPair/:pin", (req, res)=>{
    exec("gameStreamAutoPair.exe " + req.params.pin, (err, stdout, stderr)=>{
        console.log("Err: ", err);
        console.log("Output: ", stdout);
        if(err){
            res.json({
                status: "failed",
                errMsg: err.toString()
            })
            return;
        }
        res.json({
            status: "ok",
            err,stdout,stderr
        })
    })
})


app.listen(port, ()=>{
    console.log(`App listening at http://localhost:${port}`)
    hideSelf()
    notifyServer();
})

var _addThread;
const serverUrl = "http://xseed.tech:2048";
function notifyServer(){
    _addThread = setInterval(()=>{
        ipv6.getIpV6()
        .then((ip)=>{
            return axios.post(serverUrl + "/resource/join", {
                ip: ip,
                type: "dota2",
                isFree: true,
                guestAgentPort: 1704
            })
        })
        .then((serverRes)=>{
            
        })
    }, 60000);

}

function hideSelf() {

    let powershellScript = `
    Add-Type -Name Window -Namespace Console -MemberDefinition '
    [DllImport("Kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, Int32 nCmdShow);
    '

    $consolePtr = [Console.Window]::GetConsoleWindow()
    #0 hide
    [Console.Window]::ShowWindow($consolePtr, 0)
    `;

    let workingDir = process.cwd();
    let tempfile = `${workingDir}\\temp.ps1`;
    fs.writeFileSync(tempfile, powershellScript);

    //a little convoluted to get around powershell script execution policy (might be disabled)
    require('child_process').execSync(`type .\\temp.ps1 | powershell.exe -noprofile -`, {stdio: 'inherit'});
    fs.unlinkSync(tempfile); //delete temp file
}