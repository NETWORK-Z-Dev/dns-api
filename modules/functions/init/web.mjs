import path from "path"
import {configObj} from "./config.mjs"
import Logger from "@hackthedev/terminal-logger"

import ExpressStarter from "@hackthedev/express-starter"
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