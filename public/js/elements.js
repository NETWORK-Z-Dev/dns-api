function getPageContent(){
    return document.querySelector(".page-content");
}

function getHeaderLinksElement(){
    return document.querySelector(".header .links");
}

async function updateHeaderLinks() {
    let isLoggedIn = await testLogin();
    getHeaderLinksElement().innerHTML ="";
    if(!isLoggedIn) getHeaderLinksElement().insertAdjacentHTML("beforeend", `<a class="action" onClick="registerPrompt()">Register</a>`)
    if(!isLoggedIn) getHeaderLinksElement().insertAdjacentHTML("beforeend", ` <a class="action" onClick="loginPrompt()">Login</a>`)
    if(isLoggedIn) getHeaderLinksElement().insertAdjacentHTML("beforeend", `<a class="action" onClick="renderDashboard();">Dashboard</a>`)
}