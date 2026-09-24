async function registerDnsRecord({
                                     email = null,
                                     domain = null,
                                     name = null,
                                     value = null,
                                 } = {}) {
    if (!email) throw new Error("Missing email")
    if (!domain) throw new Error("Missing domain")
    if (!name) throw new Error("Missing record name")
    if (!value) throw new Error("Missing record value")
    if(!getSessionId()) throw new Error("Missing sessionId")

    let result = await fetch("/dns/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email,
            domain,
            name,
            value,
            sessionId: getSessionId(),
        })
    })

    if (result.status !== 200) {
        console.error("Unable to register dns", result)

        try{
            console.error(await result.json());
        } catch {}

        throw new Error("Unable to register account");
    }
}

async function removeDnsRecord({
                                     email = null,
                                     domain = null,
                                     name = null,
                                 } = {}) {
    if (!email) throw new Error("Missing email")
    if (!domain) throw new Error("Missing domain")
    if (!name) throw new Error("Missing record name")
    if(!getSessionId()) throw new Error("Missing sessionId")

    let result = await fetch("/dns/delete", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email,
            domain,
            name,
            sessionId: getSessionId(),
        })
    })

    if (result.status !== 200) {
        console.error("Unable to remove dns", result)

        try{
            console.error(await result.json());
        } catch {}

        throw new Error("Unable to remvoe account");
    }
}
