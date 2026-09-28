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

    if(result.status === 200){
        let login = await loginAccount({
            email,
            password
        })

        return !!login?.uuid;
    }

    return false;
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

    let jsonData = null;
    if(result.status !== 200){
        let jsonData = null;
        try{
            jsonData = await result.json();
        } catch {}

        console.error("Unable to login account: ", jsonData?.error)
        throw new Error("Login failed:\n" + jsonData?.error ?? null);
    }else{
        jsonData = await result.json();
    }

    if(jsonData?.uuid) setSessionId(jsonData.uuid)
    return jsonData;
}


async function registerPrompt(error = null){
    if(getSessionId()) return

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

            if(values?.email?.trim()?.length > 0 && values?.password?.trim()?.length > 0){
                try{
                    let register = await registerAccount({
                        email: values.email,
                        password: values.password,
                    });

                    if(register === true){
                        // success
                    }
                    else{
                        setTimeout(() => {
                            return registerAccount("Something went wrong during the registration")
                        }, 1)
                    }
                }
                catch(error){
                    console.log(error)
                    setTimeout(() => {
                        return registerAccount("You must enter an email and password")
                    }, 1)
                }
            }
            else{
                setTimeout(() => {
                    return registerAccount("You must enter an email and password")
                }, 1)
            }
        },
        ["Register", null],
    );
}

async function loginPrompt(error = null){
    customPrompts.showPrompt(
        "Login",
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

           if(values?.email?.trim()?.length > 0 && values?.password?.trim()?.length > 0){
               try{
                   let login = await loginAccount({
                       email: values.email,
                       password: values.password,
                   });

                   if(login?.uuid){
                       // success
                   }
               }
               catch(error){
                   console.log(error)
                   setTimeout(() => {
                       return loginPrompt("You must enter an email and password")
                   }, 1)
               }
           }
           else{
               setTimeout(() => {
                   return loginPrompt("You must enter an email and password")
               }, 1)
           }
        },
        ["Login", null],
    );
}