import path from "path"
import {configObj} from "./config.mjs"
import Logger from "@hackthedev/terminal-logger"

import ExpressStarter from "@hackthedev/express-starter"
import FrontendLibs from "@hackthedev/frontend-libs";
export const starter = new ExpressStarter()

export async function startWebServer(){
    starter.registerErrorHandlers(); 
    starter.registerTemplateMiddleware(); 
    starter.app.use(starter.express.static(starter.dirname + "/public")); 

    let webPort = configObj?.settings?.web?.port;
    starter.startHttpServer(webPort, async () => {
        Logger.success(`DNS Service is running on port ${webPort}`)
    })
}

export async function installWebLibs(){
    let libDir = path.join(path.resolve(), "public", "js", "libs");

    // installing multiple packages
    const results = await FrontendLibs.installMultiple([
        { package: '@hackthedev/prompts@1.0.1', path: libDir },
        { package: '@hackthedev/prompts@1.0.1', path: libDir },
        { package: '@hackthedev/chat-tools@1.0.1', path: libDir },
    ]);

    results.forEach((r) => {
        if(r?.success || r?.skipped){
            console.log(r?.message)
        }
        else{
            console.error(r?.message)
        }
    });
}