async function getAccountStats(){
    let account = await getAccount();
    if(!account) throw new Error("Unable to get account info");

    let dnsEntries = null;
    try{
        dnsEntries = await getDnsRecords()
    } catch {}

    let maxSubdmains = Number(account?.max_subdomains) ?? 0;
    let freeSubdomains = Number(account?.free_subdomains) ?? 0;
    let usedSubdomains = Number(dnsEntries?.records?.length) ?? 0;
    let subdomain_price = Number(account?.price) ?? 0;

    let dnsUsageString = `${usedSubdomains} / ${maxSubdmains}`;
    let usedAllDns = usedSubdomains === maxSubdmains

    let chargedSubdomains = ((usedSubdomains - freeSubdomains) * subdomain_price) * 12;
    if(chargedSubdomains < 0) chargedSubdomains = 0;

    account.used_subdomains = usedSubdomains;
    account.used_all_dns = usedAllDns
    account.yearly_charge = chargedSubdomains;
    account.usage_string = dnsUsageString
    account.dns_entries = dnsEntries

    return account;
}

async function renderDashboard(){
    if(!await testLogin()) return;

    await ChatTools.Dom.hideElement(getPageContent())

    let accountStats = await getAccountStats();
    let dnsEntries = accountStats?.dns_entries ?? {}

    // maybe add a test account login function here lol
    if(dnsEntries?.length === 0 || !dnsEntries || dnsEntries?.error) {
        if(dnsEntries?.error?.toLowerCase()?.includes("invalid session")){
            setSessionId(null);
            window.location.reload();
        }
    }
    else{

        // set some html first
        getPageContent().innerHTML = `
            <div class="dashboard">            
                <h1>Dashboard</h1>
                
                <div class="cards">                
                    <div class="card">
                        <h2>DNS usage</h2>
                        <p>${accountStats?.usage_string} used</p>
                    </div>         
                    
                    <div class="card">
                        <h2>Cost</h2>
                        <p>${accountStats?.yearly_charge === 0 ? `Free!` : `${accountStats?.yearly_charge}€ / year`}</p>
                    </div>              
                </div>
                
                <div class="table-container">                
                    <table class="dns">
                        <tr>
                            <th>Name</th>
                            <th>Value</th>
                            <th> </th>
                        </tr> 
                    </table>
                </div>
            </div>
        `

        // fetch elements needed
        let dnsTable = getPageContent().querySelector(".table-container .dns");
        if(!dnsTable) throw new Error("Missing dns table element");

        // and build the table
        for(let entry of dnsEntries?.records){
            await addDnsTableEntry(entry);
        }

        displayDnsTableFooter(accountStats?.used_all_dns)
    }

    await ChatTools.Dom.showElement(getPageContent())
}

function displayDnsTableFooter(usedAllDns = true){
    let dashboardContainer = document.querySelector(".dashboard");
    if(!dashboardContainer) throw new Error("Missing dashboard container element");

    let tableContainer = dashboardContainer.querySelector(".table-container");
    if(!tableContainer) throw new Error("Missing tableContainer element");

    let existingNotice = tableContainer.querySelector(".table-footer");
    if(existingNotice) existingNotice.remove();

    if(!usedAllDns){
        tableContainer.insertAdjacentHTML("beforeend", `
                <span
                class="table-footer"
                onclick="addDnsRecordPrompt()"
                >${Icon.display("add")} Add a record!</span>
            `)
    }
    else{
        tableContainer.insertAdjacentHTML("beforeend", `
                <span
                class="table-footer"
                >${Icon.display("x")} You've used up all addresses! <br>Buy additional ones!</span>
            `)
    }
}

async function addDnsTableEntry(entry){
    if(!entry?.name) return;
    getPageContent().querySelector("table.dns")?.insertAdjacentHTML("beforeend", `
                <tr>
                    <td><span style="font-weight: bold">${entry?.name}</span><span class="hint">.${entry?.domain ?? ""}</span></td>
                    <td>${entry?.value}</td>
                    <td class="row">
                        <span class="action">${Icon.display("edit")}</span>
                        <span onclick="removeDnsRecordPrompt({
                            domain: '${entry?.domain}',
                            name: '${entry?.name}'
                        })" class="action">${Icon.display("del")}</span>
                    </td>
                </tr>
            `)
}

async function updateDashboardDnsTable(){
    let dnsEntries = null;
    try{
        dnsEntries = await getDnsRecords()
    } catch {}

    let localDnsEntries = [...document.querySelectorAll(".dashboard table.dns tr")]

    if(dnsEntries?.records?.length === 0) return
    if(localDnsEntries?.length === 0) return
    localDnsEntries.shift(); // remove the header

    let remoteEntriesArray = dnsEntries?.records?.map(record => `${record.name}.${record.domain}`)

    // remove local entries that didnt exist on the remote
    for(let entry of localDnsEntries){
        let name = entry.querySelectorAll("td")?.[0]?.textContent;

        let existsOnRemote = remoteEntriesArray.includes(name);
        if(!existsOnRemote) entry.remove();

        let remoteArrIndex = remoteEntriesArray.indexOf(name)
        remoteEntriesArray.splice(remoteArrIndex, 1)
    }

    // and then if there are still some remote entries not present locally, add them
    if(remoteEntriesArray?.length > 0){
        for(let entry of remoteEntriesArray){
            let remoteEntry = dnsEntries?.records?.find(record => {
                return entry.startsWith(record?.name) && entry.endsWith(record?.domain);
            })

            let fullSubdomain = `${remoteEntry?.name}.${remoteEntry?.domain}`;
            if(remoteEntry != null && (entry === fullSubdomain)) await addDnsTableEntry(remoteEntry)
        }
    }

    let accountStats = await getAccountStats();
    displayDnsTableFooter(accountStats?.used_all_dns ?? true);
}