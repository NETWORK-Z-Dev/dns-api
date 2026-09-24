function setSessionId(id){
    localStorage.setItem("uuid", id);
}

function getSessionId(){
    return localStorage.getItem("uuid");
}
