const axios = require('axios')
const uuid = require('uuid').v4;
const xmlParser = require('fast-xml-parser');
const { createHash, createSign} = require("crypto");
const httpPort = 47989;
const httpsPort = 47984;
const fs = require("fs")
const https = require("https");
const {exec} = require("child_process")
const sign = createSign('SHA256');
const CryptoJS = require("crypto-js")
const {X509} = require("jsrsasign");

const uniqueMoonlightClientId = "0123456789ABCDEF"
const obj = {};

function buildUniqueUuidString(){
    return "uniqueid="+uniqueMoonlightClientId+"&uuid="+uuid();
}

function getServerInfo(){
    var url = this.httpBaseUrl + "serverinfo";
    return obj.httpClient.get(url).then(res=>{
        // console.log(xmlParser.parse(res.data));
        return xmlParser.parse(res.data).root;
    })
}

function encryptAes(data, secretKey){
    var blockSizeRounded = Math.floor((data.length + 15) / 16) * 16;
    var roundedBuff = Buffer.alloc(blockSizeRounded, 0);
    data.copy(roundedBuff, 0, 0, blockSizeRounded);
    
    secretKey = CryptoJS.enc.Hex.parse(
        secretKey.toString("hex")
    );
    roundedBuff = CryptoJS.enc.Hex.parse(
        roundedBuff.toString("hex")
    );
    var encrypted = CryptoJS.AES.encrypt(roundedBuff, secretKey, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.NoPadding,
        format: CryptoJS.format.Hex
    });

    return Buffer.from(encrypted.toString(), "hex");
}

function decryptAes(data, secretKey){
    var blockSizeRounded = Math.floor((data.length + 15) / 16) * 16;
    var roundedBuff = Buffer.alloc(blockSizeRounded, 0);
    data.copy(roundedBuff, 0, 0, blockSizeRounded);

    secretKey = CryptoJS.enc.Hex.parse(
        secretKey.toString("hex")
    );
    roundedBuff = CryptoJS.enc.Hex.parse(
        roundedBuff.toString("hex")
    );
    var decrypt = CryptoJS.AES.decrypt({ciphertext: roundedBuff}, secretKey,{
        mode:CryptoJS.mode.ECB,
        padding: CryptoJS.pad.NoPadding,
        format: CryptoJS.format.Hex
    });
    return Buffer.from(decrypt.toString(), "hex");
    //return encryptAes(data, secretKey);
}

function pair (){
    console.log("This client obj: ", this);
    
    var hashAlgo, hashLength;
    if(parseInt(this.serverInfo.appversion.split(".")[0]) >= 7){
        // Use SHA-256
        hashAlgo = 'sha256';
        hashLength = 32;
    }
    else{
        //Use SHA-1
        hashAlgo = 'sha1';
        hashLength = 20;
    }

    var fixedPin = "1234";
    var fixedSalt = Buffer.alloc(16, 1);
    var saltPin = Buffer.concat([
        fixedSalt,
        Buffer.from(fixedPin, "utf-8"),
        // Buffer.from(fixedSalt, "utf-8")
    ]);
    var aesKeyFull = createHash(hashAlgo)
    .update(saltPin).digest();
    var aesKey = Buffer.alloc(16)
    aesKeyFull.copy(aesKey, 0, 0, 16);

    var url = obj.httpBaseUrl + "pair?" + buildUniqueUuidString() +
    "&devicename=roth&updateState=1&phrase=getservercert&salt=" + fixedSalt.toString('hex').toUpperCase()
    + "&clientcert=" + obj.clientKeyPair.cert.toString('hex').toUpperCase();

    var chainedPairOp = obj.httpClient.get(url)
    .catch(err=>{
        console.log("Pair req failed - getServerCert", err)
        obj.httpClient.get(obj.httpBaseUrl + "unpair?" + buildUniqueUuidString());
    })
    .then((res)=>{
        obj.serverCert = xmlParser.parse(res.data).root.plaincert;

        // AES challenge - it's not random as security in this context is unnecessary
        var randomChallenge = Buffer.alloc(16, 1);
        var encryptedChallenge = encryptAes(randomChallenge, aesKey);

        // var decryptedChallenge = decryptAes(encryptedChallenge, aesKey);

        // challengeResp
        var url = obj.httpBaseUrl + "pair?" + buildUniqueUuidString() + 
        "&devicename=roth&updateState=1&clientchallenge=" + encryptedChallenge.toString('hex').toUpperCase();

        return obj.httpClient.get(url);
    })
    .catch(err=>{
        console.log("Pair req failed - clientChallenge", err)
        obj.httpClient.get(obj.httpBaseUrl + "unpair?" + buildUniqueUuidString());
    })
    .then((res)=>{
        var res = xmlParser.parse(res.data).root;
        if(res.paired != 1){
            // Another pairing in progress
            var stopPoint = 1;
        }

        var serverChallengeResp =  Buffer.from(res.challengeresponse, "hex")
        serverChallengeResp = decryptAes(serverChallengeResp, aesKey);

        var serverResponse = Buffer.alloc(hashLength, 0);
        serverChallengeResp.copy(serverResponse, 0, 0, hashLength);
        var serverChallenge = Buffer.alloc(16, 0);
        serverChallengeResp.copy(serverChallenge, 0, hashLength, hashLength + 16);

        var clientSecret = Buffer.alloc(16, 1);
        var clientSignature; //= new X509Certificate(this.clientKeyPair.cert).publicKey;
        var x509Cert = new X509();
        x509Cert.readCertPEM(this.clientKeyPair.cert.toString("utf8"));
        clientSignature = x509Cert.getSignatureValueHex();
        clientSignature = Buffer.from(clientSignature, "hex");
        
        var challengeRespHash = createHash(hashAlgo).update(
            Buffer.concat([serverChallenge, clientSignature, clientSecret])
        ).digest();

        var challengeRespEncrypted = encryptAes(challengeRespHash, aesKey);

        // secretResp
        var url = this.httpBaseUrl + "pair?" + buildUniqueUuidString()
        + "&devicename=roth&updateState=1&serverchallengeresp=" + challengeRespEncrypted.toString('hex').toUpperCase();

        return obj.httpClient.get(url)
    })
    .catch(err=>{
        console.log("Pair req failed - serverChallengeClientResp", err)
        obj.httpClient.get(this.httpBaseUrl + "unpair?" + buildUniqueUuidString());
    })
    .then((res)=>{
        var res = xmlParser.parse(res.data).root;
        var serverSecretResp = Buffer.from(res.pairingsecret, "hex");
        var serverSecret = Buffer.alloc(16, 0);
        serverSecretResp.copy(serverSecret, 0, 0, 16);
        var serverSignature = Buffer.alloc(256, 0);
        serverSecretResp.copy(serverSignature, 0, 16, 16 + 256);

        // Verify server secret - Do we need this? No.
        // verifySignature(serverSecret, serverSignature, serverCert)
        // Ensure PIN correct - Need this? No.

        var sign = createSign('sha256WithRSAEncryption');
        var clientSecret = Buffer.alloc(16, 1);
        sign.update(clientSecret).end();
        var signedSecret = sign.sign(obj.clientKeyPair.key);
        var clientPairingSecret = Buffer.concat([clientSecret, signedSecret]);
        // clientSecretResp
        var url = obj.httpBaseUrl + "pair?" + buildUniqueUuidString() +
        "&devicename=roth&updateState=1&clientpairingsecret=" + clientPairingSecret.toString('hex').toUpperCase();

        return obj.httpClient.get(url);
    })
    .catch(err=>{
        console.log("Pair req failed - clientSecretResp", err)
        obj.httpClient.get(obj.httpBaseUrl + "unpair?" + buildUniqueUuidString());
    })
    .then((res)=>{

        var pairChallengeUrl =  obj.httpsBaseUrl + "pair?" + buildUniqueUuidString()
         + "&devicename=roth&updateState=1&phrase=pairchallenge";

        return obj.httpClient.get(pairChallengeUrl);
    })
    .catch(err=>{
        console.log("Pair req failed - pairChallenge", err)
        obj.httpClient.get(obj.httpBaseUrl + "unpair?" + buildUniqueUuidString());
    })
    .then((res)=>{
        var res = xmlParser.parse(res.data).root;
        console.log(res)
    })

    setTimeout(()=>obj.autoPair("1234"), 500);

    return chainedPairOp;
}

function _quitAppsOp_proneToError(trial, loopback, maxTrial/*coolDownMs*/){
    var tryCancelUrl = obj.httpsBaseUrl + "cancel?" + buildUniqueUuidString();
    console.log("Trial: ", trial);

    return obj.httpClient.get(tryCancelUrl)
    .catch((err)=>{
        if(trial >= maxTrial){
            return Promise.reject(err);
        }
        else{
            return loopback(trial + 1, loopback, maxTrial);
        }
    })
}
function quitAllApps(){
    console.log("Starting quitApp op...");
    var tryOp = _quitAppsOp_proneToError(0, _quitAppsOp_proneToError, 5/*, 200*/);
    tryOp = tryOp.then((res)=>{
        console.log("Quit successful: ", xmlParser.parse(res.data));
        console.log("Raw res: ", res.data);
	return xmlParser.parse(res.data)
    })
    return tryOp;
}

function pairChallenge(){
    var pairChallengeUrl = obj.httpsBaseUrl + "pair?" + buildUniqueUuidString()
         + "&devicename=roth&updateState=1&phrase=pairchallenge";

    return obj.httpClient.get(pairChallengeUrl)
    .then((res)=>{
        console.log(res.data);
    });
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
    obj.hostAddr = hostAddr;
    obj.httpBaseUrl = "http://[" + hostAddr + "]:" + httpPort + "/";
    obj.httpsBaseUrl = "https://[" + hostAddr + "]:" + httpsPort + "/";

    obj.pair = pair;
    obj.autoPair = autoPair;
    obj.getServerInfo = getServerInfo;
    obj.quitAllApps = quitAllApps;
    obj.pairChallenge = pairChallenge;

    // For testing
    obj.encryptAes = encryptAes;
    obj.decryptAes = decryptAes;

    obj.clientKeyPair = {
        // key: Buffer.from(fs.readFileSync("uselessCert/key.pem")),
        // cert: Buffer.from(fs.readFileSync("uselessCert/certificate.pem")),
        key: fs.readFileSync("uselessCert/client.pem"),
        cert: fs.readFileSync("uselessCert/client.crt")
    }

    // Trick to accept server self-signed cert, without bunches of code
    // for creating a ca.pem for it!
    // process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
    obj.httpClient = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false, 
            key: obj.clientKeyPair.key,
            cert: obj.clientKeyPair.cert,
            // ciphers:'TLS_AES_128_GCM_SHA256'
        })
    })

    obj.init = ()=>{
        return obj.getServerInfo().then(serverInfo=>{
            obj.serverInfo = serverInfo;
        })
    }

    return obj;
}
