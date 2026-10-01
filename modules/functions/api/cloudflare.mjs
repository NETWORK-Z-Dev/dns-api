import { configObj } from "../init/config.mjs";
import Logger from "@hackthedev/terminal-logger"

function getApiHeader(){
    return {
        headers: {
            'Authorization': `Bearer ${configObj.settings.cloudflare.api_token}`,
            'Content-Type': 'application/json'
        },
    }
}

export function checkDnsName(name){
    if(!name) throw new Error("Missing name for dns name check")

    let prohibitedNames = [
        "official",
        "support",
        "@",
        "",
        "admin",
        "staff",
        "contact",
        "mail",
        "email",
        "office",
        "service",
    ]

    return !prohibitedNames.includes(name);
}

export async function getDomainZoneInfo(domainName){
    if(!domainName) throw new Error("Domain Name required!");

    let response = await fetch(`${configObj.settings.cloudflare.url}/zones`, {
        signal: AbortSignal.timeout(2500),
        ...getApiHeader()
    });
    
    if(response.status !== 200){
        Logger.error(`Unable to get zone id for domain ${domainName}`)
        Logger.error(response.status, response.statusText);

        return {
            error: "Unable to get zone id",
            zoneId: null,
        }
    }

    let jsonData = (await response.json()).result.filter(zone => zone.name === domainName);

    return {
        id: jsonData[0].id,
        name: jsonData[0].name
    }
}

export async function getZoneDnsEntry(domain, name){
    let zoneInfo = await getDomainZoneInfo(domain);
    if(!zoneInfo?.id) return null;

    let response = await fetch(`${configObj.settings.cloudflare.url}/zones/${zoneInfo.id}/dns_records`, {
        signal: AbortSignal.timeout(2500),
        ...getApiHeader()
    });
    
    if(response.status !== 200){
        Logger.error(`Unable to get dns for zone ${zoneInfo.id}`)
        Logger.error(response.status, response.statusText);

        return {
            error: "Unable to get zone dns",
            data: null,
        }
    }

    let jsonData = (await response.json()).result.filter(entry => entry.name.startsWith(`${name}.`));
    return jsonData[0]
}

export async function getZoneDns(zoneId){
    let response = await fetch(`${configObj.settings.cloudflare.url}/zones/${zoneId}/dns_records`, {
        signal: AbortSignal.timeout(2500),
        ...getApiHeader()
    });
    
    if(response.status !== 200){
        Logger.error(`Unable to get dns for zone ${zoneId}`)
        Logger.error(response.status, response.statusText);

        return {
            error: "Unable to get zone id",
            data: null,
        }
    }

    let jsonData = await response.json();
    return jsonData
}

export async function addDnsToZone(domainName, name, value, comment = ""){
    let zoneInfo = await getDomainZoneInfo(domainName);

    let response = await fetch(`${configObj.settings.cloudflare.url}/zones/${zoneInfo?.id}/dns_records`, {
        method: "POST",
        signal: AbortSignal.timeout(2500),
        ...getApiHeader(),
        body: JSON.stringify({
            name: `${name}.${zoneInfo.name}`,
            content: value,
            comment,
            ttl: 3600,
            proxied: false,
            type: "A"
        })
    });
    
    if(response.status !== 200){
        Logger.error(`Unable to set dns for zone ${zoneInfo.id} - ${name}`)
        Logger.error(response.status);

        return {
            response,
            error: "Unable to set dns for zone id",
            zoneId: null,
        }
    }

    let jsonData = await response.json();
    let wasSuccessful = !!jsonData?.success;
    if(!wasSuccessful){
        Logger.error("Unable to set dns record ${name} with value ${value} for zone ${zoneInfo.id}")
        Logger.error(jsonData)

        return false;
    }

    return !!jsonData?.success
}


export async function removeDnsFromZone(domainName, name){
    let zoneInfo = await getDomainZoneInfo(domainName);
    let zoneEntry = await getZoneDnsEntry(domainName, name)

    if(!zoneEntry?.id) {
        return {
            error: "Zone entry not found"
        }
    }

    let response = await fetch(`${configObj.settings.cloudflare.url}/zones/${zoneInfo?.id}/dns_records/${zoneEntry.id}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(2500),
        ...getApiHeader(),
    });
    
    if(response.status !== 200){
        Logger.error(`Unable to delete dns entry ${name} for zone ${zoneInfo.id}`)
        Logger.error(response.status);

        return {
            response,
            error: `Unable to delete dns entry ${name} for zone ${zoneInfo.id}`,
            zoneId: zoneInfo.id,
        }
    }

    return true
}

export async function updateDnsFromZone({
    domainName = null,
    oldName = null,
    newName = null,
    newValue = null,
    newComment = null,
                                        }){
    if(!domainName) throw new Error("Missing domain name");
    if(!oldName) throw new Error("Missing domain name");
    if(!newName) throw new Error("Missing domain name");
    if(!newValue) throw new Error("Missing domain name");
    if(!newComment) throw new Error("Missing domain name");

    let zoneInfo = await getDomainZoneInfo(domainName);
    let zoneEntry = await getZoneDnsEntry(domainName, name)

    if(!zoneEntry?.id) {
        return {
            error: "Zone entry not found"
        }
    }

    let response = await fetch(`${configObj.settings.cloudflare.url}/zones/${zoneInfo?.id}/dns_records/${zoneEntry.id}`, {
        method: "PUT",
        signal: AbortSignal.timeout(2500),
        ...getApiHeader(),
        body: JSON.stringify({
            name,
            comment: newComment,
            content: newValue,
            proxied: false,
        })
    });

    if(response.status !== 200){
        Logger.error(`Unable to update dns entry ${name} for zone ${zoneInfo.id}`)
        Logger.error(response.status);

        return {
            response,
            error: `Unable to update dns entry ${name} for zone ${zoneInfo.id}`,
            zoneId: zoneInfo.id,
        }
    }

    return true
}
