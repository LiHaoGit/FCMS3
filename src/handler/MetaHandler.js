const Meta = require("../Meta")
const SystemMeta = require("../SystemMeta")

exports.aGetAllMeta = async function(ctx) {
    ctx.body = Meta.getMetaForFront()
}

exports.aGetMeta = async function(ctx) {
    let type = ctx.params.type
    let name = ctx.params.name

    if (type === "entity")
        ctx.body = Meta.getEntities()[name]
    else
        ctx.status = 400
}

exports.aSaveMeta = async function(ctx) {
    let type = ctx.params.type
    let name = ctx.params.name
    let meta = ctx.request.body

    if (type === "entity")
        await Meta.aSaveEntityMeta(name, meta)
    else
        return ctx.status = 400

    ctx.status = 204
}

exports.aImportMeta = async function(ctx) {
    let meta = ctx.request.body

    for (let e of meta.entities) {
        delete e._id
        await Meta.aSaveEntityMeta(e.name, e)
    }

    ctx.status = 204
}

exports.aRemoveMeta = async function(ctx) {
    let type = ctx.params.type
    let name = ctx.params.name

    if (type === "entity")
        await Meta.gRemoveEntityMeta(name)
    else
        return ctx.status = 400

    ctx.status = 204
}

exports.aGetEmptyEntityMeta = async function(ctx) {
    let e = {fields: {}, db: Meta.DB.mongo}
    SystemMeta.patchSystemFields(e)
    ctx.body = e
}

exports.aGetActions = async function(ctx) {
    ctx.body = Meta.actions
}
