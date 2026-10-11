import dSyncSql from "@hackthedev/dsync-sql"
import {configObj} from "./config.mjs";

export let db = null
export async function initDatabase(){
    if(!db === null) return;

    db = new dSyncSql({
        host: "127.0.0.1",
        port: 3306, // optional, default 3306
        user: configObj.settings.db.user,
        password: configObj.settings.db.pass,
        database: configObj.settings.db.db,
        waitForConnections: true, // optional
        connectionLimit: 10, // optional
        queueLimit: 0, // optional
    });


    await db.waitForConnection();

    const tables = [
        {
            name: "account",
            columns: [
                {name: "id", type: "int NOT NULL AUTO_INCREMENT PRIMARY KEY"},
                {name: "email", type: "varchar(500) NOT NULL UNIQUE KEY"},
                {name: "password", type: "varchar(500) NOT NULL"},
                {name: "max_subdomains", type: "int NOT NULL DEFAULT 2"},
                {name: "free_subdomains", type: "int NOT NULL DEFAULT 2"},
                {name: "price", type: "DECIMAL(10,2) NOT NULL DEFAULT 1.5"},
                {name: "api_key", type: "text DEFAULT NULL"},
            ]
        },
        {
            name: "dns",
            columns: [
                {name: "id", type: "int NOT NULL AUTO_INCREMENT PRIMARY KEY"},
                {name: "accountId", type: "int NOT NULL"},
                {name: "name", type: "varchar(500) NOT NULL"},
                {name: "domain", type: "varchar(500) NOT NULL"},
                {name: "value", type: "varchar(500) NOT NULL"},
            ]
        },
        {
            name: "domains",
            columns: [
                {name: "id", type: "int NOT NULL AUTO_INCREMENT PRIMARY KEY"},
                {name: "domainName", type: "varchar(500) UNIQUE KEY"},
                {name: "available", type: "int NOT NULL DEFAULT 0"},
            ]
        }
    ]

    for (const table of tables) {
        await db.checkAndCreateTable(table);
    }
}
