function getPageContent(){
    return document.querySelector(".page-content");
}

function getHeaderLinksElement(){
    return document.querySelector(".header .links");
}

function addHeaderLinks() {

    if(!getSessionId()) getHeaderLinksElement().insertAdjacentHTML("beforeend", `<a class="action" onClick="registerPrompt()">Register</a>`)
    if(!getSessionId()) getHeaderLinksElement().insertAdjacentHTML("beforeend", ` <a class="action" onClick="loginPrompt()">Login</a>`)
    if(getSessionId()) getHeaderLinksElement().insertAdjacentHTML("beforeend", `<a class="action" onClick="renderDashboard();">Dashboard</a>`)
}