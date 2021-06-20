const axios = require('axios')
const uuid = require('uuid').v4;
const xmlParser = require('fast-xml-parser');
const { createHash } = require("crypto");
const httpPort = 47989;
const httpsPort = 47984;
const fs = require("fs")
const {exec} = require("child_process")

const uniqueMoonlightClientId = "0123456789ABCDEF"

function buildUniqueUuidString(){
    return "uniqueid="+uniqueMoonlightClientId+"&uuid="+uuid();
}

function getServerInfo(){
    var url = this.httpBaseUrl + "serverinfo";
    return axios.get(url).then(res=>{
        // console.log(xmlParser.parse(res.data));
        return xmlParser.parse(res.data).root;
    })
}

function pair (){
    console.log(this.httpBaseUrl);
    
    var hash;
    if(parseInt(this.serverInfo.appversion.split(".")[0]) >= 7){
        // Use SHA-256
        hash = createHash('sha256');
    }
    else{
        //Use SHA-1
        console.log("Old version. Not supported");
        return;
    }

    var fixedPin = "1234";
    var fixedSalt = Buffer.alloc(16, 1);
    var saltPin = Buffer.concat([
        fixedSalt,
        Buffer.from(fixedPin, "utf-8"),
        // Buffer.from(fixedSalt, "utf-8")
    ]);
    hash.update(saltPin);
    var aesKeyFull = hash.digest();
    var aesKey = Buffer.alloc(16)
    aesKeyFull.copy(aesKey, 0, 0, 16);


    var url = this.httpBaseUrl + "pair?" + buildUniqueUuidString() +
    "&devicename=roth&updateState=1&phrase=getservercert&salt=" + fixedSalt.toString('hex')
    + "&clientcert=" + this.clientKeyPair.cert.toString('hex');

    axios.get(url).then((res)=>{})
    .catch(err=>(console.log("Pair req failed:", err)));

    setTimeout(()=>this.autoPair("1234"), 500);
}

function autoPair(pin){
    exec("gameStreamAutoPair.exe " + pin, (err, stdout, stderr)=>{
        console.log("Err: ", err);
        console.log("Output: ", stdout);
        if(err){
            return {
                status: "failed",
                errMsg: err.toString()
            }
        }
        return{
            status: "ok",
            err,stdout,stderr
        };
    })
}

module.exports = function(hostAddr){
    var obj = {};
    obj.hostAddr = hostAddr;
    obj.httpBaseUrl = "http://[" + hostAddr + "]:" + httpPort + "/";
    obj.httpsBaseUrl = "https://[" + hostAddr + "]:" + httpsPort + "/";

    obj.pair = pair;
    obj.getServerInfo = getServerInfo;

    obj.clientKeyPair = {
        key: Buffer.from(fs.readFileSync("uselessCert/key.pem")),
        cert: Buffer.from(fs.readFileSync("uselessCert/certificate.pem")),
    }

    obj.getServerInfo().then(serverInfo=>{
        obj.serverInfo = serverInfo;
    })

    return obj;
}