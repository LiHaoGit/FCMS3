const _ = require("lodash")
const crypto = require("crypto")
const ObjectId = require("mongodb").ObjectId

const Util = require("./Util")
const Log = require("./Log")

const Mongo = require("./storage/Mongo")
const Redis = require("./storage/Redis")

exports.DB = {mongo: "mongodb", mysql: "mysql", none: "none"}

exports.ObjectIdStringLength = 24

// 字段逻辑类型（应用层类型）
exports.FieldDataTypes = ["ObjectId", "String", "Password", "Boolean",
    "Int", "Float",
    "Date", "Time", "DateTime",
    "Image", "File",
    "Component", "Reference", "Object"]

// MongoDB存储类型
const MongoPersistTypes = ["ObjectId", "String", "Boolean", "Number",
    "Date", "Document"]

const MySQLPersistTypes = ["varchar", "char", "blob", "text",
    "int", "bit", "tinyint", "bigint", "decimal", "float", "double",
    "datetime", "date", "time", "timestamp"]

exports.AllPersistTypes = MongoPersistTypes.concat(MySQLPersistTypes)

exports.InputTypes = ["Text", "Password", "TextArea", "RichText", "JSON",
    "Select", "Check", "Int", "Float", "CheckList",
    "Date", "Time", "DateTime", "File", "Image",
    "InlineComponent", "PopupComponent", "TabledComponent", "Reference"]

exports.actions = {}

function isDateOrTimeType(fieldType) {
    return fieldType === "Date" || fieldType === "Time" ||
        fieldType === "DateTime"
}

let entities = null

const MetaStoreId = new ObjectId().toString()

Redis.subscribe("MetaChange", async function(metaStoreId) {
    if (metaStoreId !== MetaStoreId) return

    Log.system.info("MetaChanged")

    await exports.aLoad()
})

// 获取实体
exports.getEntityMeta = name => {
    let e = entities[name]
    if (!e) throw new Error("No such entity meta: " + name)
    return e
}

// 获取纯实体
exports.getEntities = () => entities

// 前端使用的元数据
exports.getMetaForFront = () => ({entities: entities})

exports.aLoad = async function(extraEntities) {
    const SystemMeta = require("./SystemMeta")
    SystemMeta.init(extraEntities)

    let db = await Mongo.stores.main.aDatabase()

    let c = db.collection("F_EntityMeta")
    let entitiesList = await c.find({}).toArray()

    // 下面没有异步操作
    entities = {}
    for (let e of entitiesList) entities[e.name] = e

    Object.assign(entities, SystemMeta.SystemEntities)

    Log.system.info("Meta loaded")
}

exports.aSaveEntityMeta = async function(entityName, entityMeta) {
    "use strict"
    entityMeta._modifiedOn = new Date()
    delete entityMeta._version

    let db = await Mongo.stores.main.aDatabase()
    let c = db.collection("F_EntityMeta")

    await c.updateOne({name: entityName},
        {$set: entityMeta, $inc: {_version: 1}}, {upsert: true})

    entities[entityName] = entityMeta

    await Redis.aPublish("MetaChange", MetaStoreId)
}

exports.gRemoveEntityMeta = async function(entityName) {
    "use strict"
    let db = await Mongo.stores.main.aDatabase()
    let c = db.collection("F_EntityMeta")
    await c.removeOne({name: entityName})

    delete entities[entityName]

    await Redis.aPublish("MetaChange", MetaStoreId)
}

// 将 HTTP 输入的实体或组件值规范化
// 过滤掉元数据中没有的字段
exports.parseEntity = function(entityInput, entityMeta) {
    if (!entityInput) return entityInput
    if (!_.isObject(entityInput)) return undefined
    let entityValue = {}
    let fields = entityMeta.fields
    for (let fName in fields) {
        let fMeta = fields[fName]
        let fv = exports.parseFieldValue(entityInput[fName], fMeta)
        // undefined / NaN 去掉，null 保留！
        if (!(_.isUndefined(fv) || _.isNaN(fv))) entityValue[fName] = fv
    }

    return entityValue
}

// 将 HTTP 输入的查询条件中的值规范化
exports.parseListQueryValue = function(criteria, entityMeta) {
    // 如果输入的值有问题，可能传递到下面的持久层，如 NaN, undefined, null
    if (criteria.relation)
        for (let item of criteria.items)
            exports.parseListQueryValue(item, entityMeta)
    else if (criteria.field) {
        let fieldMeta = entityMeta.fields[criteria.field]
        criteria.value = exports.parseFieldValue(criteria.value, fieldMeta)
    }
}

// 将 HTTP 输入的字段值规范化，value 可以是数组
exports.parseFieldValue = function(value, fieldMeta) {
    if (!fieldMeta) return undefined // TODO 异常处理
    // null / undefined 语义不同
    if (_.isNil(value)) return value // null/undefined 原样返回

    // for 循环放在 if 内为提高效率
    if (isDateOrTimeType(fieldMeta.type)) {
        if (_.isArray(value))
            return _.map(value, i => Util.longToDate(i))
        else
            return Util.longToDate(value)
    } else if (fieldMeta.type === "ObjectId") {
        if (_.isArray(value))
            return _.map(value,
                i => Mongo.stringToObjectIdSilently(i)) // null 值不去
        else
            return Mongo.stringToObjectIdSilently(value)
    } else if (fieldMeta.type === "Reference") {
        let refEntityMeta = exports.getEntityMeta(fieldMeta.refEntity)
        if (!refEntityMeta)
            throw new Error(`No ref entity [${fieldMeta.refEntity}]. ` +
                `Field ${fieldMeta.name}.`)

        let idMeta = refEntityMeta.fields._id
        return exports.parseFieldValue(value, idMeta)
    } else if (fieldMeta.type === "Boolean")
        if (_.isArray(value))
            return _.map(value, i => Util.stringToBoolean(i))
        else
            return Util.stringToBoolean(value)
    else if (fieldMeta.type === "Int")
        if (_.isArray(value))
            return _.map(value, i => Util.stringToInt(i))
        else
            return Util.stringToInt(value)
    else if (fieldMeta.type === "Float")
        if (_.isArray(value))
            return _.map(value, i => Util.stringToFloat(i))
        else
            return Util.stringToFloat(value)
    else if (fieldMeta.type === "Component") {
        let refEntityMeta = exports.getEntityMeta(fieldMeta.refEntity)
        if (!refEntityMeta)
            throw new Error(`No ref entity [${fieldMeta.refEntity}].` +
                `Field ${fieldMeta.name}.`)

        if (_.isArray(value))
            return _.map(value, i => exports.parseEntity(i, refEntityMeta))
        else
            return exports.parseEntity(value, refEntityMeta)
    } else if (fieldMeta.type === "Password") {
        if (!value) return undefined // 不接受空字符串

        if (_.isArray(value))
            return _.map(value, i => exports.hashPassword(i))
        else
            return exports.hashPassword(value)
    } else
        return value ? value : null // 空字符串转为 null
}

exports.parseId = function(id, entityMeta) {
    if (_.isString(entityMeta))
        entityMeta = exports.getEntityMeta(entityMeta)
    return exports.parseFieldValue(id, entityMeta.fields._id)
}

exports.parseIds = function(ids, entityMeta) {
    if (!ids) return ids

    if (_.isString(entityMeta))
        entityMeta = exports.getEntityMeta(entityMeta)

    let idMeta = entityMeta.fields._id
    let list = []
    for (let id of ids) {
        let i = exports.parseFieldValue(id, idMeta)
        if (i) list.push(i)
    }
    return list
}

exports.formatFieldToHttp = function(fieldValue, fieldMeta) {
    if (!fieldValue) return fieldValue

    if (isDateOrTimeType(fieldMeta.type))
        if (fieldMeta.multiple)
            return _.map(fieldValue, i => Util.dateToLong(i))
        else
            return Util.dateToLong(fieldValue)
    else if (fieldMeta.type === "Component") {
        let refEntityMeta = exports.getEntityMeta(fieldMeta.refEntity)
        if (!refEntityMeta)
            throw new Error(`No ref entity [${fieldMeta.refEntity}]. ` +
                `Field ${fieldMeta.name}`)

        if (fieldMeta.multiple)
            return _.map(fieldValue, i =>
                exports.formatEntityToHttp(i, refEntityMeta))
        else
            return exports.formatEntityToHttp(fieldValue, refEntityMeta)
    } else if (fieldMeta.type === "Reference")
        return fieldValue // TODO 原样输出即可
    else if (fieldMeta.type === "Password")
        return undefined
    else
        return fieldValue
}

exports.formatEntityToHttp = function(entityValue, entityMeta) {
    if (!entityValue) return entityValue

    let output = {}

    for (let fName in entityMeta.fields) {
        let fieldMeta = entityMeta.fields[fName]
        let o = exports.formatFieldToHttp(entityValue[fName], fieldMeta)
        if (!_.isUndefined(o)) output[fName] = o
    }

    return output
}

exports.formatEntitiesToHttp = function(entityValues, entityMeta) {
    if (!(entityValues && entityValues.length)) return entityValues
    return _.map(entityValues, e => exports.formatEntityToHttp(e, entityMeta))
}

exports.hashPassword = function(password) {
    if (!password) return password
    return crypto.createHash("md5").update(password + password).digest("hex")
}

exports.getCollectionName = function(entityMeta, repo) {
    if (repo === "trash")
        return entityMeta.tableName + "_trash"
    else
        return entityMeta.tableName
}

exports.newObjectId = function() {
    return new ObjectId()
}

exports.imagePathsToImageObjects = function(paths, thumbnailFilled) {
    if (!(paths && paths.length)) return paths

    return _.map(paths, path => {
        let o = {path: path}
        if (thumbnailFilled) o.thumbnail = path
        return o
    })
}
