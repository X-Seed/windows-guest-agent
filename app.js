const express = require("express");
const app = express()
const port = 1704
const {exec} = require("child_process")
const fs = require('fs')

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
})

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