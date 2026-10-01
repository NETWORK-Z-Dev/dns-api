import {
    getAccountFromDb,
    getIdentifierFromSessionId,
    getUUID,
    insertAccountIntoDb,
    verifyAccount,
    verifySessionId
} from "./account.mjs";
import {db} from "../init/sql.mjs";
import {starter} from "../init/web.mjs";
import {addDnsToZone, checkDnsName, getZoneDnsEntry, removeDnsFromZone} from "./cloudflare.mjs";
import dSyncRateLimit from "@hackthedev/dsync-ratelimit";

const rateLimiter = new dSyncRateLimit();

export async function getAccountDnsCount(identifier){
    if(!identifier) throw new Error("Missing Account identifier")

    let account = await getAccountFromDb(identifier);
    if(!account?.id) return null;

    let rows = await db.queryDatabase(
        `SELECT * FROM dns WHERE accountId = ?`,
        [account.id]
    )

    return rows.length;
}

export async function getAccountDnsRecords(identifier){
    if(!identifier) throw new Error("Missing Account identifier")

    let account = await getAccountFromDb(identifier);
    if(!account?.id) return null;

    let rows = await db.queryDatabase(
        `SELECT * FROM dns WHERE accountId = ?`,
        [account.id]
    )

    return rows;
}

export async function getAccountDnsRecord(identifier, domain, name){
    if(!identifier) throw new Error("Missing Account identifier")
    if(!name) throw new Error("Missing name")
    if(!domain) throw new Error("Missing domain")

    let account = await getAccountFromDb(identifier);
    if(!account?.id) return null;

    let rows = await db.queryDatabase(
        `SELECT * FROM dns WHERE accountId = ? AND name = ? AND domain = ? LIMIT 1`,
        [account.id, name, domain]
    )

    return rows[0];
}

export async function registerAccountDnsRecord(identifier, domain, name, value){
    if(!identifier) throw new Error("Missing Account identifier")
    if(!name) throw new Error("Missing name")
    if(!domain) throw new Error("Missing domain")
    if(!value) throw new Error("Missing value")

    let account = await getAccountFromDb(identifier);
    if(!account?.id) return null;

    let rows = await db.queryDatabase(
        `INSERT INTO dns (accountId, name, domain, value) VALUES (?, ?, ?, ?)`,
        [account.id, name, domain, value]
    )

    return rows.affectedRows > 0;
}

export async function deleteAccountDnsRecord(identifier, domain, name){
    if(!identifier) throw new Error("Missing Account identifier")
    if(!name) throw new Error("Missing name")
    if(!domain) throw new Error("Missing domain")

    let account = await getAccountFromDb(identifier);
    if(!account?.id) return null;

    let rows = await db.queryDatabase(
        `DELETE FROM dns WHERE accountID = ? and name = ? AND domain = ?`,
        [account.id, name, domain]
    )

    return rows.affectedRows > 0;
}

export async function registerDnsEndpoints(){
    starter.app.post('/dns/register', rateLimiter.middleware({
            getIpLimit: async () => 5,
            getTotalLimit: async () => 50,
            getBlockUntil: async () => new Date(Date.now() + (5 * 60_000))
        }),
        starter.express.json(),
        async (req, res) => {
            const {email, sessionId, name, domain, value} = req?.body;

            if(!email) return res.status(400).json({error: "Email is missing"});
            if(!sessionId) return res.status(400).json({error: "Session is missing"});
            if(!domain) return res.status(400).json({error: "domain is missing"});
            if(!value) return res.status(400).json({error: "value is missing"});

            let isValid = await verifySessionId(sessionId);
            if(!isValid) return res.status(400).json({error: "Invalid session"});

            let account = await getAccountFromDb(email);
            let existingAccountRecordCount = await getAccountDnsCount(email);
            if(existingAccountRecordCount >= account.max_subdomains){
                return res.status(400).json({error: `Account DNS limit of ${account.max_subdomains} reached!`});
            }

            let existingRecord = await getAccountDnsRecord(email, domain, name)
            let existingDnsRecord = await getZoneDnsEntry(domain, name)
            if(!existingRecord && !existingDnsRecord) {
                // local so we know which account is who
                let regRes = await registerAccountDnsRecord(email, domain, name, value)
                if(regRes === false) return res.status(500).json({error: "Unable to register record"});

                // cloudflare
                let dnsRecordReg = await addDnsToZone(domain, name, value, `${email}`)
                if(dnsRecordReg === false) {
                    await deleteAccountDnsRecord(email, domain, name) // undo on cf error
                    return res.status(500).json({error: "Unable to register dns record"});
                }
            }
            else{
                return res.status(400).json({error: "Record already exists!"});
            }
        })

    starter.app.delete('/dns/delete', rateLimiter.middleware({
            getIpLimit: async () => 5,
            getTotalLimit: async () => 50,
            getBlockUntil: async () => new Date(Date.now() + (5 * 60_000))
        }),
        starter.express.json(),
        async (req, res) => {
            const {email, sessionId, name, domain} = req?.body;

            if(!email) return res.status(400).json({error: "Email is missing"});
            if(!sessionId) return res.status(400).json({error: "Session is missing"});
            if(!domain) return res.status(400).json({error: "domain is missing"});

            let isValid = await verifySessionId(sessionId);
            if(!isValid) return res.status(400).json({error: "Invalid session"});

            let existingRecord = await getAccountDnsRecord(email, domain, name)
            let existingDnsRecord = await getZoneDnsEntry(domain, name)

            console.log(existingRecord, existingDnsRecord)

            if(existingRecord?.id || existingDnsRecord?.id) {
                // local so we know which account is who
                let regRes = await deleteAccountDnsRecord(email, domain, name)

                // cloudflare
                let dnsRecordReg = await removeDnsFromZone(domain, name,)
            }
            else{
                return res.status(400).json({error: "Record not found!"});
            }
        })

    starter.app.put('/dns/update', rateLimiter.middleware({
            getIpLimit: async () => 5,
            getTotalLimit: async () => 50,
            getBlockUntil: async () => new Date(Date.now() + (5 * 60_000))
        }),
        starter.express.json(),
        async (req, res) => {
            const {sessionId, domainName, oldName, newName, newValue} = req?.body;
            if(!sessionId) return res.status(400).json({error: "Session is missing"});
            if(!domainName) return res.status(400).json({error: "Domain name is missing"});
            if(!oldName) return res.status(400).json({error: "Old name is missing"});
            if(!newName) return res.status(400).json({error: "New name is missing"});
            if(!newValue) return res.status(400).json({error: "new value is missing"});

            if(!checkDnsName(oldName)) return res.status(400).json({error: "Session is missing"});
            if(!checkDnsName(newName)) return res.status(400).json({error: "Session is missing"});

            let isValid = await verifySessionId(sessionId);
            if(!isValid) return res.status(400).json({error: "Invalid session"});

            let sessionEmail = getIdentifierFromSessionId(sessionId);

            return res.status(200).json({ error: null, records: await getAccountDnsRecords(sessionEmail)})
        })

    starter.app.post('/dns/get', rateLimiter.middleware({
            getIpLimit: async () => 5,
            getTotalLimit: async () => 50,
            getBlockUntil: async () => new Date(Date.now() + (5 * 60_000))
        }),
        starter.express.json(),
        async (req, res) => {
            const {sessionId} = req?.body;
            if(!sessionId) return res.status(400).json({error: "Session is missing"});

            let isValid = await verifySessionId(sessionId);
            if(!isValid) return res.status(400).json({error: "Invalid session"});

            let sessionEmail = getIdentifierFromSessionId(sessionId);

            return res.status(200).json({ error: null, records: await getAccountDnsRecords(sessionEmail)})
        })
}