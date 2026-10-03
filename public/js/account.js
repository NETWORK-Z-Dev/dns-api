async function registerAccount({
                                   email = null,
                                   password = null,
                               } = {}) {
    if (!email) throw new Error("Missing email for account registration")
    if (!password) throw new Error("Missing password for account registration")
    if (password.lenth < 8) throw new Error("Password length should be at least 8 characters")

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

    if (result.status !== 200) {
        console.error("Unable to register account", result)
        throw new Error("Unable to register account");
    }

    if (result.status === 200) {
        let login = await loginAccount({
            email,
            password
        })

        await updateHeaderLinks();
        return !!login?.uuid;
    }

    return false;
}

async function testLogin() {
    try {
        let accountLoginTest = await getAccount();
        return !accountLoginTest?.error;
    } catch {
        return false;
    }
}

async function getAccount() {
    if (!getSessionId()) throw new Error("Missing session id for account login")

    let result = await fetch("/account/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sessionId: getSessionId()
        })
    })

    let jsonData = null;
    if (result.status !== 200) {
        try {
            jsonData = await result.json();
        } catch {
        }

        console.log(jsonData, result.status);
        console.error("Unable to get account: ", jsonData?.error)
    } else {
        jsonData = await result.json();
    }

    if (jsonData?.account) {
        return jsonData?.account;
    }

    return jsonData;
}

async function generateAccountApiKey() {
    if (!getSessionId()) throw new Error("Missing session id for account login")

    let result = await fetch("/account/api/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sessionId: getSessionId()
        })
    })

    let jsonData = null;
    if (result.status !== 200) {
        try {
            jsonData = await result.json();
        } catch {
        }

        console.log(jsonData, result.status);
        console.error("Unable to generate api key: ", jsonData?.error)
    } else {
        jsonData = await result.json();
    }

    return jsonData?.key;
}

async function loginAccount({
                                email = null,
                                password = null,
                                api_key = null,
                            } = {}) {

    if (!email && !api_key) throw new Error("Missing email for account login")
    if (!password && !api_key) throw new Error("Missing password for account login")

    let result = await fetch("/account/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email,
            password,
            api_key
        })
    })

    let jsonData = null;
    if (result.status !== 200) {
        let jsonData = null;
        try {
            jsonData = await result.json();
        } catch {
        }

        console.error("Unable to login account: ", jsonData?.error)
        throw new Error("Login failed:\n" + jsonData?.error ?? null);
    } else {
        jsonData = await result.json();
    }

    if (jsonData?.uuid) {
        setSessionId(jsonData.uuid)
        localStorage.setItem("email", email);
        await updateHeaderLinks();
    }
    return jsonData;
}


async function registerPrompt(error = null) {
    if (getSessionId()) return

    customPrompts.showPrompt(
        "Register",
        ` 
            <div class="error-text" style="display: ${error ? "flex" : "none"}">${error ?? ""}</div>
            <div class="prompt-form-group">
                <label class="prompt-label" for="email">Email</label>
                <input class="prompt-input" type="text" name="email">
            </div>
    
            <div class="prompt-form-group">
                <label class="prompt-label" for="password">Password</label>
                <input class="prompt-input" type="password" name="password">
            </div>
            
            `, // html to display
        async (values) => { // on submit callback
            // values are based on the 'name' property of elements

            if (values?.email?.trim()?.length > 0 && values?.password?.trim()?.length > 0) {
                try {
                    let register = await registerAccount({
                        email: values.email,
                        password: values.password,
                    });

                    if (register === true) {
                        // success
                    } else {
                        setTimeout(() => {
                            return registerAccount("Something went wrong during the registration")
                        }, 1)
                    }
                } catch (error) {
                    console.log(error)
                    setTimeout(() => {
                        return registerAccount("You must enter an email and password")
                    }, 1)
                }
            } else {
                setTimeout(() => {
                    return registerAccount("You must enter an email and password")
                }, 1)
            }
        },
        ["Register", null],
    );
}

async function loginPrompt(error = null) {
    customPrompts.showPrompt(
        "Login",
        ` 
            <div class="error-text" style="display: ${error ? "flex" : "none"}">${error ?? ""}</div>
            <div class="prompt-form-group">
                <label class="prompt-label" for="email">Email</label>
                <input class="prompt-input" type="text" name="email" value="${localStorage.getItem("email") ?? ""}">
            </div>
    
            <div class="prompt-form-group">
                <label class="prompt-label" for="password">Password</label>
                <input class="prompt-input" type="password" name="password">
            </div>
            
            `, // html to display
        async (values) => { // on submit callback
            // values are based on the 'name' property of elements

            if (values?.email?.trim()?.length > 0 && values?.password?.trim()?.length > 0) {
                try {
                    let login = await loginAccount({
                        email: values.email,
                        password: values.password,
                    });

                    if (login?.uuid) {
                        // success
                    }
                } catch (error) {
                    console.log(error)
                    setTimeout(() => {
                        return loginPrompt("Your login failed")
                    }, 1)
                }
            } else {
                setTimeout(() => {
                    return loginPrompt("You must enter an email and password")
                }, 1)
            }
        },
        ["Login", null],
    );
}

async function apiKeyPopup(error = null) {
    if (!getSessionId()) return

    customPrompts.showConfirm(
        {
            title: "Create API Key",
            text: `
            <p>You can create an api key to have an application automatically setup your records.</p><br>
            
            <p>Please Note:</p>
            <ul>
                <li>When creating an API key you wont be able to view it again after creation!</li>
                <li>If you aleady created an API key before the old one will be invalid if you proceed!</li>
            </ul
            `
        },
        [
            ["Yes, create it!", "error"],
            ["No cancel!", "gray"]
        ], // html to display
        async (values) => { // on submit callback
            // values are based on the 'name' property of elements

            if (values === "yes, create it!") {
                let apiKey = await generateAccountApiKey()
                if(apiKey){
                    await customPrompts.closePrompt();
                    showApiKey(apiKey)
                }
            }
        }
    );
}

async function showApiKey(key) {
    if (!getSessionId()) return

    customPrompts.showConfirm(
        {
            title: "Your API Key",
            text: `
            <p>Your API key has been generated!</p>
            <p>Keep it save and store it if needed because you wont be able to see it again!</p><br>
            
            <p>Your key:</p>
            <code>${key}</code>
            `
        },
        [
            ["Got it!", "success"]
        ], // html to display
        async (values) => {
        }
    );
}