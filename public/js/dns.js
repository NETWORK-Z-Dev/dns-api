async function registerDnsRecord({
                                     domain = null,
                                     name = null,
                                     value = null,
                                 } = {}) {
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
    else if(result.status === 200){
        await updateDashboardDnsTable();
    }
}

async function removeDnsRecord({
                                     email = null,
                                     domain = null,
                                     name = null,
                                 } = {}) {
    if (!domain) throw new Error("Missing domain")
    if (!name) throw new Error("Missing record name")
    if(!getSessionId()) throw new Error("Missing sessionId")

    let result = await fetch("/dns/delete", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
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

        throw new Error("Unable to remove dns record");
    }
    else if(result.status === 200){
        await updateDashboardDnsTable();
    }
}

async function getDnsRecords() {
    if(!getSessionId()) throw new Error("Missing sessionId")

    let result = await fetch("/dns/get", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sessionId: getSessionId(),
        })
    })

    let dnsData = null;
    try{
        dnsData = await result.json();
    } catch {}

    if (result.status !== 200) {
        console.error("Unable to get dns", dnsData)
        throw new Error("Unable to get dns " + dnsData);
    }
    else if(result.status === 200){
        return dnsData;
    }
}

async function getDomains() {
    if(!getSessionId()) throw new Error("Missing sessionId")

    let result = await fetch("/dns/domains/get", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sessionId: getSessionId(),
        })
    })

    let domainData = null;
    try{
        domainData = await result.json();
    } catch {}

    if (result.status !== 200) {
        console.error("Unable to get domains", domainData)
        throw new Error("Unable to get domains " + domainData);
    }
    else if(result.status === 200){
        return domainData?.domains;
    }
}

async function addDnsRecordPrompt(error = null){
    if(!getSessionId()) return

    let domains = await getDomains();
    if(!domains) throw new Error("Domains werent found :/")

    customPrompts.showPrompt(
        "Add record",
        ` 
            <div class="error-text" style="display: ${error ? "flex" : "none"}">${error ?? ""}</div>
            
            <div class="prompt-form-group">
                <label class="prompt-label" for="domain">Available Domains</label>
                <select name="domain" id="domain" style="width: 100%; padding: 8px;background-color: transparent; color: white;outline: none;">
                ${
                    domains.map(domain => `<option>${domain}</option>`)
                }
                </select>
            </div>    
            
            <div class="prompt-form-group">
                <label class="prompt-label" for="name">Name</label>
                <input class="prompt-input" type="text" name="name">
            </div>
    
            <div class="prompt-form-group">
                <label class="prompt-label" for="password">Content</label>
                <input class="prompt-input" type="text" name="content">
            </div>
            
            `, // html to display
        async (values) => { // on submit callback
            // values are based on the 'name' property of elements

            if(values?.name?.trim()?.length > 0 && values?.content?.trim()?.length > 0){
                try{
                    await registerDnsRecord({
                        domain: values?.domain,
                        name: values?.name?.trim(),
                        value: values?.content?.trim()
                    });
                }
                catch(error){
                    console.log(error)
                    setTimeout(() => {
                        return registerAccount("You must enter a name and value")
                    }, 1)
                }
            }
            else{
                setTimeout(() => {
                    return registerAccount("You must enter a name and value")
                }, 1)
            }
        },
        ["Add", null],
    );
}

async function removeDnsRecordPrompt({
    domain = null,
    name = null,
                                     } = {}){
    if(!getSessionId()) return
    if(!domain) throw new Error("Missing domain")
    if(!name) throw new Error("Missing record name")

    customPrompts.showConfirm(
        `Remove record ${name}.${domain}?`,
        [
            ["Yes", "indianred"],
            ["No", "gray"]
        ],
        async (values) => { // on submit callback
            console.log(values)

            if(values === "yes"){
                await removeDnsRecord({
                    domain,
                    name
                });
            }
        },
    );
}