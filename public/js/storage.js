function setSessionId(id){
    if(id === null) return localStorage.removeItem("uuid")
    localStorage.setItem("uuid", id);
}

function getSessionId(){
    return localStorage.getItem("uuid");
}
