async function renderDashboard(){
    if(!await testLogin()) return;

    await ChatTools.Dom.hideElement(getPageContent())

    let account = await getAccount();
    if(!account) throw new Error("Unable to get account info");

    let dnsEntries = null;
    try{
        dnsEntries = await getDnsRecords({
            email: "your-mom.at"
        })
    } catch {}

    // maybe add a test account login function here lol
    if(dnsEntries?.length === 0 || !dnsEntries || dnsEntries?.error) {
        if(dnsEntries?.error?.toLowerCase()?.includes("invalid session")){
            setSessionId(null);
            window.location.reload();
        }
    }
    else{
        let dnsUsageString = `${dnsEntries?.records?.length ?? 0} / ${account?.max_subdomains ?? 0}`;
        let usedAllDns = (dnsEntries?.records?.length ?? 0) === (dnsEntries?.records?.length ?? 0)

        // set some html first
        getPageContent().innerHTML = `
            <div class="dashboard">            
                <h1>Dashboard</h1>
                
                <div class="cards">                
                    <div class="card">
                        <h2>DNS usage</h2>
                        <p>${dnsUsageString} used</p>
                    </div>                    
                </div>
                
                <table class="dns">
                    <tr>
                        <th>Name</th>
                        <th>Value</th>
                        <th> </th>
                    </tr> 
                </table>
            </div>
        `

        // fetch elements needed
        let dnsTable = getPageContent().querySelector(".dns");
        if(!dnsTable) throw new Error("Missing dns table element");

        // and build the table
        for(let entry of dnsEntries?.records){
            dnsTable.insertAdjacentHTML("beforeend", `
                <tr>
                    <td><span style="font-weight: bold">${entry?.name}</span><span class="hint">.${entry?.domain ?? ""}</span></td>
                    <td>${entry?.value}</td>
                    <td class="row">
                        <span class="action">${Icon.display("edit")}</span>
                        <span class="action">${Icon.display("del")}</span>
                    </td>
                </tr>
            `)
        }
    }

    await ChatTools.Dom.showElement(getPageContent())
}