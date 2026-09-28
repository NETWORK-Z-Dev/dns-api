async function renderDashboard(){
    getPageContent().innerHTML = `
        <div class="dashboard">
            <h1>Dashboard</h1>
            <table class="dns">
                <tr>
                    <th>Name</th>
                    <th>Value</th>
                    <th> </th>
                </tr> 
            </table>
        </div>
    `

    let dnsTable = getPageContent().querySelector(".dns");
    if(!dnsTable) throw new Error("Missing dns table element");

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
        for(let entry of dnsEntries?.records){
            dnsTable.insertAdjacentHTML("beforeend", `
                <tr>
                    <td><span style="font-weight: bold">${entry?.name}</span><span class="hint">.${entry?.domain ?? ""}</span></td>
                    <td>${entry?.value}</td>
                    <td>&cross;</td>
                </tr>
            `)
        }
    }


}