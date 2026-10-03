import {maxIpLimit, rateLimitBlockTime, starter, totalReqLimit} from "../init/web.mjs";
import dSyncRateLimit from "@hackthedev/dsync-ratelimit";
import {db} from "../init/sql.mjs";
import {hash, verify} from "argon2";
import crypto from "crypto"

const rateLimiter = new dSyncRateLimit();
const sessions = new Map();

export function getUUID(){
    return crypto.randomUUID();
}

export function getIdentifierFromSessionId(sessionId){
    if(!sessionId) throw new Error("Missing session id")
    return sessions.get(sessionId)?.email ?? null;
}

export async function getAccountFromDb(identifier){
    if(!identifier) throw new Error("Identifier not provided");

    let row = await db.queryDatabase(
        `SELECT * FROM account WHERE email = ? OR api_key = ? LIMIT 1`,
        [identifier, hashApiKey(identifier)],
    )

    if(row.length > 0) return row[0];
    return null;
}

function hashApiKey(apiKey){
    return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export async function generateAccountApiKey(identifier){
    if(!identifier) throw new Error("Identifier not provided");

    let apiKey = crypto.randomBytes(32).toString("hex");

    await db.queryDatabase(
        `UPDATE account SET api_key = ? WHERE email = ?`,
        [hashApiKey(apiKey), identifier],
    );

    return apiKey;
}

export async function verifyAccountApiKey(apiKey){
    if(!apiKey) throw new Error("API key not provided");

    let row = await db.queryDatabase(
        `SELECT id FROM account WHERE api_key = ?`,
        [hashApiKey(apiKey)],
    );

    return row.length !== 0;
}

export async function verifyAccount(identifier, password){
    if(!identifier) throw new Error("Identifier not provided");
    if(!password) throw new Error("password not provided");

    let account = await getAccountFromDb(identifier);
    let accountPasswordHash = account.password;
    return verify(accountPasswordHash, password);
}

export async function deleteAccountFromDb(identifier){
    if(!identifier) throw new Error("identifier not provided");

    let row = await db.queryDatabase(
        `DELETE FROM account WHERE email = ?`,
        [identifier],
    )

    return row?.affectedRows > 0;

}

export async function insertAccountIntoDb({
    email = null,
    password = null
                                          } = {}){
    if(!email) throw new Error("data email not provided");
    if(!password) throw new Error("data password not provided");

    let hashedPassword = await hash(password);

    let row = await db.queryDatabase(
        `INSERT INTO account (email, password) VALUES(?, ?)`,
        [email, hashedPassword]
    )

    return row.affectedRows > 0;

}

export function verifySessionId(sessionId){
    return !!(sessionId && sessions.get(sessionId));

}

export async function registerAccountEndpoints(){
    starter.app.post('/account/register', rateLimiter.middleware({
        getIpLimit: async () => maxIpLimit,
        getTotalLimit: async () => totalReqLimit,
        getBlockUntil: async () => rateLimitBlockTime
    }),
        starter.express.json(),
        async (req, res) => {
        const {email, password} = req?.body;

        if(!email) return res.status(400).json({error: "Email is missing"});
        if(!password) return res.status(400).json({error: "Password is missing"});

        let account = await getAccountFromDb(email);
        if(!account) {
            let wasCreated = await insertAccountIntoDb({
                email,
                password
            });

            if(wasCreated === true) return res.status(200).json({error: null});
            if(wasCreated === false) return res.status(400).json({error: "Unable to create account! Server error!"});
        }
        else{
            res.status(400).json({error: "Account already exists"});
        }
    })

    starter.app.post('/account/login', rateLimiter.middleware({
        getIpLimit: async () => maxIpLimit,
        getTotalLimit: async () => totalReqLimit,
        getBlockUntil: async () => rateLimitBlockTime
    }),
        starter.express.json(),
        async (req, res) => {
            const {email, password, sessionId, api_key} = req?.body;

            let account = null;

            if(verifySessionId(sessionId) && !api_key) return res.status(200).json({error: null});
            if(api_key) {
                let isVerified = await verifyAccountApiKey(api_key);
                account = await getAccountFromDb(api_key);
                if(isVerified) return generateLoginSession(account?.email);
            }

            if(!email) return res.status(400).json({error: "Email is missing"});
            if(!password) return res.status(400).json({error: "Password is missing"});

            account = await getAccountFromDb(email);
            if(!account) {
                return res.status(400).json({error: "Account doesnt exist!"});
            }
            else{
                let isValid = await verifyAccount(email, password)
                if(isValid) {
                    return generateLoginSession(email);
                }
                return res.status(400).json({error: "Account credentials didnt match"});
            }

            function generateLoginSession(email){
                let uuid = getUUID();
                sessions.set(uuid, {
                    email
                })
                return res.status(200).json({error: null, uuid});
            }
    })

    starter.app.post('/account/', rateLimiter.middleware({
        getIpLimit: async () => maxIpLimit,
        getTotalLimit: async () => totalReqLimit,
        getBlockUntil: async () => rateLimitBlockTime
    }),
        starter.express.json(),
        async (req, res) => {

            const {sessionId} = req?.body;

            if(!sessionId) return res.status(400).json({error: "Session id is missing"});
            if(!verifySessionId(sessionId)) return res.status(400).json({error: "Invalid session"});

            let sessionEmail = getIdentifierFromSessionId(sessionId);
            if(!sessionEmail) return res.status(400).json({error: "Email not found in account"});

            let account = await getAccountFromDb(sessionEmail);
            if(!account) return res.status(400).json({error: "Account doesnt exist!"});

            return res.status(200).json({ error: null, account });
    })

    starter.app.post('/account/api/generate', rateLimiter.middleware({
            getIpLimit: async () => maxIpLimit,
            getTotalLimit: async () => totalReqLimit,
            getBlockUntil: async () => rateLimitBlockTime
        }),
        starter.express.json(),
        async (req, res) => {

            const {sessionId} = req?.body;

            if(!sessionId) return res.status(400).json({error: "Session id is missing"});
            if(!verifySessionId(sessionId)) return res.status(400).json({error: "Invalid session"});

            let sessionEmail = getIdentifierFromSessionId(sessionId);
            if(!sessionEmail) return res.status(400).json({error: "Email not found in account"});

            let account = await getAccountFromDb(sessionEmail);
            if(!account) return res.status(400).json({error: "Account doesnt exist!"});

            return res.status(200).json({ error: null, key: await generateAccountApiKey(account?.email) });
        })
}