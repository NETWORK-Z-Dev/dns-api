import {startWebServer} from "./modules/functions/init/web.mjs"
import { initConfig } from "./modules/functions/init/config.mjs"
import { addDnsToZone, getDomainZoneInfo, getZoneDns, getZoneDnsEntry, removeDnsFromZone } from "./modules/functions/api/cloudflare.mjs"

await initConfig();
startWebServer();

let zone = "eichelkäse-meier-gmbh.at";
let zoneEntry = await getZoneDnsEntry(zone, "test")

if(zoneEntry?.id){
    let worked = await removeDnsFromZone(zone, "test")
    console.log("removed", worked)
}
else{
    let addRes = await addDnsToZone(zone, "test", "64.133.55.23", "API ACC #134")
    console.log("added", addRes)
}