var CryptoJS = require("crypto-js");

var key = CryptoJS.enc.Hex.parse("0206f4a990908a1c9ef78f98a9e7fcfb");
var plaintText = CryptoJS.enc.Hex.parse("08080808000000000000000000000000"); 
//encrypt
var encryptedData = CryptoJS.AES.encrypt(plaintText, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.NoPadding
});
console.log("plaintText：" + plaintText);
console.log("encryptedData ：" , Buffer.from(encryptedData.toString(), "base64"));

var encryptedDataHexStr = encryptedData.toString(CryptoJS.format.Hex);
console.log("encryptedDataHex：" + encryptedDataHexStr );

//-------------------------------------------------------------------------
//decrypt 


var encryptedHex = CryptoJS.enc.Hex.parse(encryptedDataHexStr);
var encryptedBase64 = CryptoJS.enc.Base64.stringify(encryptedHex);
console.log("encryptedHex  ：" + encryptedHex);
console.log("encryptedBase64  ：" + encryptedBase64 );

var decryptedData = CryptoJS.AES.decrypt(encryptedBase64, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.NoPadding,
});

let decryptText = decryptedData.toString(CryptoJS.enc.Hex);
console.log("decryptText ：" + decryptText );
