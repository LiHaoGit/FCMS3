const _ = require("lodash")

const Errors = require("../Errors")
const Meta = require("../Meta")
const Log = require("../Log")
const Util = require("../Util")

const Mongo = require("../storage/Mongo")

exports.aCreate = async function(entityMeta, instance) {
    "use strict"
    // ObjectId 或非 String 的 id 由调用者设置，这里自动设置 String 类型的 ID
    if (entityMeta.fields._id.persistType === "String" && _.isNil(instance._id))
        instance._id = Meta.newObjectId().toString()

    let db = await Mongo.stores[entityMeta.dbName].aDatabase()
    let c = db.collection(entityMeta.tableName)

    try {
        let res = await c.insertOne(instance)
        return Mongo.getInsertedIdObject(res)
    } catch (e) {
        if (!Mongo.isIndexConflictError(e)) throw e
        let {code, message} = errorToDupKeyError(e, entityMeta)
        throw new Errors.UniqueConflictError(code, message)
    }
}

exports.aUpdateManyByCriteria = async function(entityMeta, criteria,
    instance) {
    let update = objectToMongoUpdate(instance)
    if (!update) return 0

    let nativeCriteria = Mongo.toMongoCriteria(criteria)

    let db = await Mongo.stores[entityMeta.dbName].aDatabase()
    let c = db.collection(entityMeta.tableName)

    try {
        let res = await c.updateMany(nativeCriteria, update)
        let r = Mongo.getUpdateResult(res)
        return r.modifiedCount
    } catch (e) {
        if (!Mongo.isIndexConflictError(e)) throw e
        let {code, message} = errorToDupKeyError(e, entityMeta)
        throw new Errors.UniqueConflictError(code, message)
    }
}

exports.aUpdateOneByCriteria = async function(entityMeta, criteria, instance) {
    let update = objectToMongoUpdate(instance)
    if (!update) return 0

    let nativeCriteria = Mongo.toMongoCriteria(criteria)

    let db = await Mongo.stores[entityMeta.dbName].aDatabase()
    let c = db.collection(entityMeta.tableName)

    let r
    try {
        let res = await c.updateOne(nativeCriteria, update)
        r = Mongo.getUpdateResult(res)
    } catch (e) {
        if (!Mongo.isIndexConflictError(e)) throw e
        let {code, message} = errorToDupKeyError(e, entityMeta)
        throw new Errors.UniqueConflictError(code, message)
    }

    if (r.modifiedCount !== 1) throw new Errors.UserError("ConcurrentUpdate")
}

exports.aRemoveManyByCriteria = async function(entityMeta, criteria) {
    let nativeCriteria = Mongo.toMongoCriteria(criteria)

    if (entityMeta.removeMode === "toTrash")
        return aRemoveManyToTrash(entityMeta, nativeCriteria)
    else
        return aRemoveManyCompletely(entityMeta, nativeCriteria)
}

// 软删除有几种方式：放在单独的表中，放在原来的表中+使用标记字段。
// 放在单独的表中，在撤销删除后，有id重复的风险：例如删除id为1的实体，其后又产生了id为1的实体，则把删除的实体找回后就主键冲突了
// 好在目前采用ObjectId的方式不会导致该问题。
// 放在原表加标记字段的方式，使得所有的查询都要记得查询删除标记为false的实体，并影响索引的构建，麻烦

async function aRemoveManyToTrash(entityMeta, criteria) {
    let trashTable = Meta.getCollectionName(entityMeta, "trash")

    let db = await Mongo.stores[entityMeta.dbName].aDatabase()
    let formalCollection = db.collection(entityMeta.tableName)
    let trashCollection = db.collection(trashTable)

    let list = await formalCollection.find(criteria).toArray()

    for (let entity of list) {
        entity._modifiedOn = new Date()
        entity._version++
    }

    await trashCollection.insertMany(list)
    await formalCollection.deleteMany(criteria)
}

async function aRemoveManyCompletely(entityMeta, criteria) {
    let db = await Mongo.stores[entityMeta.dbName].aDatabase()
    let c = db.collection(entityMeta.tableName)
    await c.deleteMany(criteria)
}

exports.aRecoverMany = async function(entityMeta, ids) {
    let trashTable = Meta.getCollectionName(entityMeta, "trash")

    let db = await Mongo.stores[entityMeta.dbName].aDatabase()
    let formalCollection = db.collection(entityMeta.tableName)
    let trashCollection = db.collection(trashTable)

    let list = await trashCollection.find({_id: {$in: ids}}).toArray()

    for (let entity of list) {
        entity._modifiedOn = new Date()
        entity._version++
    }

    try {
        await formalCollection.insertMany(list)
    } catch (e) {
        if (!Mongo.isIndexConflictError(e)) throw e
        let {code, message} = errorToDupKeyError(e, entityMeta)
        throw new Errors.UniqueConflictError(code, message)
    }

    await trashCollection.deleteMany({_id: {$in: ids}})
}

exports.aFindOneByCriteria = async function(entityMeta, criteria, o) {
    let collectionName = Meta.getCollectionName(entityMeta, o && o.repo)

    let nativeCriteria = Mongo.toMongoCriteria(criteria)

    let db = await Mongo.stores[entityMeta.dbName].aDatabase()
    let c = db.collection(collectionName)
    let projection = Util.arrayToTrueObject(o && o.includedFields) || {}
    return c.findOne(nativeCriteria, projection)
}

// sort 为 mongo 原生格式
exports.aList = async function(options) {
    let {
        entityMeta, criteria, sort,
        repo, includedFields, pageNo, pageSize, withoutTotal
    } = options
    let collectionName = Meta.getCollectionName(entityMeta, repo)
    let nativeCriteria = Mongo.toMongoCriteria(criteria)
    includedFields = Util.arrayToTrueObject(includedFields) || {}

    let db = await Mongo.stores[entityMeta.dbName].aDatabase()
    let c = db.collection(collectionName)

    let cursor = c.find(nativeCriteria, includedFields).sort(sort)
    // 判定是否分页
    if (pageSize > 0) cursor.skip((pageNo - 1) * pageSize).limit(pageSize)

    let page = await cursor.toArray()
    // Log.debug('page', page)
    if (withoutTotal) {
        return page
    } else {
        let total = await c.count(nativeCriteria)
        return {total, page}
    }
}

function errorToDupKeyError(e, entityMeta) {
    // Log.debug('toDupKeyError, message', e.message)
    // E11000 duplicate key error index: fcms.F_User.$F_User_nickname dup key: { : "yyyy" }
    let matches = e.message.match(/index:\s(.+)\$(.+) dup key: (.+)/)
    if (matches) {
        let indexName = matches[2]
        // let value = matches[3]
        Log.debug("toDupKeyError, indexName=" + indexName)

        let indexConfig = _.find(entityMeta.mongoIndexes, i =>
            entityMeta.tableName + "_" + i.name === indexName)
        if (!indexConfig) Log.system.warn("No index config for " + indexName)
        let message = indexConfig && indexConfig.errorMessage ||
            `值重复：${indexName}`
        return {code: "DupKey", message, key: indexName}
    } else {
        return {code: "DupKey", message: e.message, key: null}
    }
}

// 用户提交的更新后的对象，转换为 mongo 的 $set
function objectToMongoUpdate(object) {
    if (!_.size(object)) return null

    delete object._version
    delete object._id

    let set = {}
    let unset = {}

    for (let key in object) {
        let value = object[key]

        if (!_.isNil(value))
            set[key] = value
        else
            unset[key] = ""
    }

    let update = {$inc: {_version: 1}}
    if (_.size(set)) update.$set = set
    if (_.size(unset)) update.$unset = unset

    return update
}

// (async function () {
//     "use strict"
//
//     let Config = require('../Config')
//
//     Log.config({})
//     Config.mongoDatabases = [
//         {name: "main", url: 'mongodb://localhost:27017/fcms-ch'},
//         {name: "bp", url: 'mongodb://localhost:27017/bp'}
//     ]
//
//     Mongo.init()
//
//     try {
//     } finally {
//         await Mongo.aDispose()
//     }
// })()
