const Config = require("../Config")

const pugLocals = {}
exports.pugLocals = pugLocals

if (Config.serverPugPath) {
    const Pug = require("koa-pug")
    exports.pug = new Pug({
        viewPath: Config.serverPugPath,
        locals: pugLocals,
        noCache: process.env.DEV === "1"
    })
}
