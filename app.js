const express = require("express");
const app = express()
const port = 1704
const {exec} = require("child_process")

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
        })
    })
})

app.listen(port, ()=>{
    console.log(`App listening at http://localhost:${port}`)
})