import JSONTools from "@hackthedev/json-tools"
import path from "path"
import fs from "fs"

let configFolderPath = path.join(path.resolve(), "configs")
let configFilePath = path.join(configFolderPath, "config.json")
export let configObj = null

export async function initConfig(){
    if(!fs.existsSync(configFolderPath)) fs.mkdirSync(configFolderPath);
    if(!fs.existsSync(configFilePath)) fs.writeFileSync(configFilePath, "{}");

    let parsedConfig = JSON.parse(fs.readFileSync(configFilePath, "utf8"));

    // only update it if null, otherwise we may lose data during runtime accidentally!
    if(configObj === null) configObj = parsedConfig;

    // this will generate missing config settings
    checkConfig();
    await saveConfig();
}

export async function saveConfig(){
    if(Object.keys(configFilePath ?? {})?.length > 0) fs.writeFileSync(configFilePath, JSON.stringify(configObj, null, 4))
}

function checkConfig(){
    JSONTools.checkObjectKeys(configObj, "settings.cloudflare.url", "https://api.cloudflare.com/client/v4", true)
    JSONTools.checkObjectKeys(configObj, "settings.cloudflare.api_token", "", true)
    JSONTools.checkObjectKeys(configObj, "settings.web.port", 5001, true)

    JSONTools.checkObjectKeys(configObj, "settings.db.user", "", true)
    JSONTools.checkObjectKeys(configObj, "settings.db.pass", "", true)
    JSONTools.checkObjectKeys(configObj, "settings.db.host", "127.0.0.1", true)
    JSONTools.checkObjectKeys(configObj, "settings.db.db", "dnsapi", true)
    JSONTools.checkObjectKeys(configObj, "settings.db.port", 3306, true)
}