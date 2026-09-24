async function registerAccount({
    email = null,
    password = null,
                               } = {}){
    if(!email) throw new Error("Missing email for account registration")
    if(!password) throw new Error("Missing password for account registration")
    if(password.lenth < 8) throw new Error("Password length should be at least 8 characters")

    let result = await fetch("/account/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email,
            password
        })
    })

    if(result.status !== 200){
        console.error("Unable to register account", result)
        throw new Error("Unable to register account");
    }
}

async function loginAccount({
                                   email = null,
                                   password = null,
                               } = {}){
    if(!email) throw new Error("Missing email for account login")
    if(!password) throw new Error("Missing password for account login")

    let result = await fetch("/account/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email,
            password
        })
    })

    if(result.status !== 200){
        console.error("Unable to login account", result)
        throw new Error("Unable to login account");
    }

    let jsonData = await result.json();
    console.log(jsonData)
    if(jsonData?.uuid) setSessionId(jsonData.uuid)
}