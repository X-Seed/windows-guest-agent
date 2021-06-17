const axios = require('axios')
const http = require('http')
const os = require('os')

function getIpV6(){
    // Get from ipify.org
    return axios.get("http://api6.ipify.org/").then((res)=>{
        // console.log(res);
        return res.data;
    })

    // From OS network interface
    // UPDATE: Ignore this, as not reliable
    // os.networkInterfaces()
}

module.exports = {
    getIpV6
}