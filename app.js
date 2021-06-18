const express = require("express");
const app = express()
const port = 1704
const {exec} = require("child_process")
const fs = require('fs')
const axios = require('axios')
const ipv6 = require('./ipv6')
const beaconInterval = 10000;

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

//2.5Mb ~ test for 20Mbps
//5Mb bite size to alleviate the http connection overhead
const testBuffer = Buffer.alloc(5*1024*1024, 5);
app.all("/networkCheck/bandWidth", (req, res)=>{
    res.end(testBuffer);
})

app.all("/networkCheck/ping", (req, res)=>{
    res.end("");
})

app.listen(port, ()=>{
    console.log(`App listening at http://localhost:${port}`)
    hideSelf()
    sendBeacon()
    notifyServer();
})

var beaconThread;
const serverUrl = "http://xseed.tech:2048";
function notifyServer(){
    beaconThread = setInterval(sendBeacon, beaconInterval);
}

function sendBeacon(){
    ipv6.getIpV6()
    .then((ip)=>{
        return axios.post(serverUrl + "/resource/join", {
            ip: ip,
            type: "dota2",
            isFree: true,
            guestAgentPort: 1704
        })
    })
    .then((serverRes)=>{})
    .catch((err)=>{
        console.log("Error joining: ", err.data)
    })
};

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