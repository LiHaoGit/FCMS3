const Log = require("./Log")
const Meta = require("./Meta")
const EntityService = require("./service/EntityService")

exports.aInit = async function() {
    await aCreateAdminUser()
    await aAddDefaultMenu()
}

async function aCreateAdminUser() {
    let hasAdmin = await EntityService.aFindOneByCriteria(null, "F_User",
        {admin: true})
    if (hasAdmin) return

    Log.system.info("Create default admin user")
    await EntityService.aCreate(null, "F_User", {
        _id: Meta.newObjectId().toString(),
        admin: true,
        username: "admin",
        password: Meta.hashPassword("admin"),
    })
}

async function aAddDefaultMenu() {
    let hasMenu = await EntityService.aFindOneByCriteria(null, "F_Menu", {})
    if (hasMenu) return

    Log.system.info("Create default menu")
    await EntityService.aCreate(null, "F_Menu", defaultMenu)
}

const defaultMenu = {
    "_version": 1,
    "menuGroups": [{
        "label": null,
        "menuItems": [{"label": "用户", "toEntity": "F_User", "callFunc": null},
            {"label": "Meta", "toEntity": null, "callFunc": "F.toMetaIndex"}]
    }]
}
