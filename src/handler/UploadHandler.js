const path = require("path")

const Config = require("../Config")
const FileUtil = require("../FileUtil")
const Meta = require("../Meta")
const Errors = require("../Errors")

async function aUpload(files, query) {
    if (!files) return false

    let fileKey = Object.keys(files)[0]
    if (!fileKey) return false
    let file = files[fileKey]

    let entityName = query.entityName
    let fieldName = query.fieldName

    if (!(entityName && fieldName)) return false

    let entityMeta = Meta.getEntityMeta(entityName)
    if (!entityMeta)
        throw new Errors.UserError("NoSuchEntity", "无此实体 " + entityName)
    let fieldMeta = entityMeta.fields[fieldName]
    if (!fieldMeta)
        throw new Errors.UserError("NoSuchEntityField",
            `无此字段 ${entityName}.${fieldName}`)

    let subDir = fieldMeta.fileStoreDir || "default"
    let fileTargetDir = path.join(Config.fileDir, subDir)

    let fileFinalFullPath = path.join(fileTargetDir,
        Meta.newObjectId().toString() + path.extname(file.path))
    await FileUtil.aMoveFileTo(file.path, fileFinalFullPath)

    let fileRelativePath = path.relative(Config.fileDir, fileFinalFullPath)

    return {fileRelativePath: fileRelativePath, fileSize: file.size}
}

// H5上传
exports.aUpload = async function(ctx) {
    let result = await aUpload(ctx.request.body.files, ctx.query)

    if (result)
        ctx.body = result
    else
        ctx.status = 400
}

// Transport 上传
exports.aUpload2 = async function(ctx) {
    let result = await aUpload(ctx.request.body.files, ctx.query)
    if (result)
        result.success = true
    else
        result = {success: false}
    ctx.body = '<textarea data-type="application/json">' +
        JSON.stringify(result) + "</textarea>"
}

// WangEditor 使用的图片上传接口
exports.aUploadForRichText = async function(ctx) {
    let files = ctx.request.body.files
    if (!files) return ctx.status = 400
    let file = files.f0
    if (!file) return ctx.status = 400

    let result = await exports.aUploadUtil(file, "RichText")
    ctx.type = "text/html"
    ctx.body = Config.fileDownloadPrefix + result.fileRelativePath
}

exports.aUploadUtil = async function(file, subDir) {
    let fileTargetDir = path.join(Config.fileDir, subDir)

    let fileSize = file.size

    let fileFinalFullPath = path.join(fileTargetDir,
        Meta.newObjectId().toString() + path.extname(file.path))
    await FileUtil.aMoveFileTo(file.path, fileFinalFullPath)

    let fileRelativePath = path.relative(Config.fileDir, fileFinalFullPath)

    return {fileRelativePath: fileRelativePath, fileSize: fileSize}
}
