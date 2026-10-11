import {installWebLibs, startWebServer} from "./modules/functions/init/web.mjs"
import { initConfig } from "./modules/functions/init/config.mjs"
import { addDnsToZone, getDomainZoneInfo, getZoneDns, getZoneDnsEntry, removeDnsFromZone } from "./modules/functions/api/cloudflare.mjs"
import {initDatabase} from "./modules/functions/init/sql.mjs";
import {registerAccountEndpoints} from "./modules/functions/api/account.mjs";
import {registerDnsEndpoints} from "./modules/functions/api/dns.mjs";

await initConfig();
await initDatabase();
await installWebLibs();
await startWebServer();

await registerAccountEndpoints();
await registerDnsEndpoints();


/*
let zone = "lets-yap.online";
let sub = "DCTS_OLD"
let zoneEntry = await getZoneDnsEntry(zone, sub)

if(zoneEntry?.id){
    let worked = await removeDnsFromZone(zone, sub)
    console.log("removed", worked)
}
else{
    let addRes = await addDnsToZone(zone, sub, "64.133.55.23", "API ACC #134")
    console.log("added", addRes)
}

*/