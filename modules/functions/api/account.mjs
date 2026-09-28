import {starter} from "../init/web.mjs";
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
        `SELECT * FROM account WHERE email = ? LIMIT 1`,
        [identifier],
    )

    if(row.length > 0) return row[0];
    return null;
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
        getIpLimit: async () => 5,
        getTotalLimit: async () => 50,
        getBlockUntil: async () => new Date(Date.now() + 5 * 60_000)
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
        getIpLimit: async () => 5,
        getTotalLimit: async () => 50,
        getBlockUntil: async () => new Date(Date.now() + 5 * 60_000)
    }),
        starter.express.json(),
        async (req, res) => {
            const {email, password, sessionId} = req?.body;

            if(verifySessionId(sessionId)) return res.status(200).json({error: null});

            if(!email) return res.status(400).json({error: "Email is missing"});
            if(!password) return res.status(400).json({error: "Password is missing"});

            let account = await getAccountFromDb(email);
            if(!account) {
                return res.status(400).json({error: "Account doesnt exist!"});
            }
            else{
                let isValid = await verifyAccount(email, password)
                if(isValid) {
                    let uuid = getUUID();
                    sessions.set(uuid, {
                        email
                    })
                    return res.status(200).json({error: null, uuid});
                }
                return res.status(400).json({error: "Account credentials didnt match"});
            }
    })

    starter.app.get('/account/', rateLimiter.middleware({
        getIpLimit: async () => 5,
        getTotalLimit: async () => 50,
        getBlockUntil: async () => new Date(Date.now() + 5 * 60_000)
    }),
        starter.express.json(),
        async (req, res) => {

    })
}