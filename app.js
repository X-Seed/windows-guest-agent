const express = require("express");
const app = express()
const port = 1704
const {exec} = require("child_process")
const fs = require('fs')
const axios = require('axios')
const ipv6 = require('./ipv6')
const gfeClient = require("./gfeClient")("::")
const beaconInterval = 10000;

//5Mb bite size to alleviate the http connection overhead
const biteSize = 0.5*1024*1024;

app.get("/gameStreamAutoPair/:pin", (req, res)=>{
    res.json(
        gfeClient.autoPair(pin)
    )
})

//2.5Mb/s ~ test for 20Mbps
const testBuffer = Buffer.alloc(biteSize, 5);
app.all("/networkCheck/bandWidth", (req, res)=>{
    res.end(testBuffer);
})

app.all("/networkCheck/ping", (req, res)=>{
    res.end("");
})

app.all("/quitAllApps", (req, res)=>{
    var op = gfeClient.quitAllApps();
    op.then((res)=>{
        res.json({
            status: "ok"
        })
    })
    .catch((err)=>{
        res.json({
            status: "failed",
            errMsg: err
        })
    })
})

app.listen(port, ()=>{
    console.log(`App listening at http://localhost:${port}`)

    gfeClient.pair().then(()=>{
        console.log("GFE client successfully paired with server!");
        hideSelf()
        sendBeacon()
        notifyServer()
    })
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