const _ = require("lodash")

const Errors = require("../Errors")
const Util = require("../Util")
const Meta = require("../Meta")

const MongoService = require("./EntityServiceMongo")
const MysqlService = require("./EntityServiceMysql")
const EntityCache = require("./EntityServiceCache")

const Mysql = require("../storage/Mysql")

exports.aCreate = async function(conn, entityName, instance) {
    "use strict"
    if (!_.size(instance)) throw new Errors.UserError("CreateEmpty")
    let entityMeta = Meta.getEntityMeta(entityName)

    instance._version = 1
    instance._createdOn = new Date()
    instance._modifiedOn = instance._createdOn

    try {
        let id

        if (entityMeta.db === Meta.DB.mysql)
            id = await MysqlService.aCreate(conn, entityMeta, instance)
        else if (entityMeta.db === Meta.DB.mongo)
            id = await MongoService.aCreate(entityMeta, instance)

        instance._id = id
        return {_id: id}
    } finally {
        // 很可能实体还是被某种程度修改，导致缓存失效
        await EntityCache.aFireEntityCreated(conn, entityMeta)
    }
}
exports.aUpdateOneByCriteria = async function(conn, entityName, criteria,
    instance) {
    "use strict"
    delete instance._id
    delete instance._version
    delete instance._createdBy
    delete instance._createdOn

    if (!_.size(instance)) return

    instance._modifiedOn = new Date()

    let entityMeta = Meta.getEntityMeta(entityName)

    try {
        if (entityMeta.db === Meta.DB.mysql)
            return MysqlService.aUpdateOneByCriteria(conn, entityMeta,
                criteria, instance)
        else if (entityMeta.db === Meta.DB.mongo)
            return MongoService.aUpdateOneByCriteria(entityMeta,
                criteria, instance)
    } finally {
        // TODO 清除效率改进
        await EntityCache.aFireEntityUpdated(conn, entityMeta, null)
    }
}

exports.aUpdateManyByCriteria = async function(conn, entityName, criteria,
    instance) {
    "use strict"
    delete instance._id
    delete instance._version
    delete instance._createdBy
    delete instance._createdOn

    if (!_.size(instance)) return

    instance._modifiedOn = new Date()

    let entityMeta = Meta.getEntityMeta(entityName)

    try {
        if (entityMeta.db === Meta.DB.mysql)
            return MysqlService.aUpdateManyByCriteria(conn,
                entityMeta, criteria, instance)
        else if (entityMeta.db === Meta.DB.mongo)
            return MongoService.aUpdateManyByCriteria(entityMeta,
                criteria, instance)
    } finally {
        // TODO 清除效率改进
        await EntityCache.aFireEntityUpdated(conn, entityMeta, null)
    }
}

exports.aRemoveManyByCriteria = async function(conn, entityName, criteria) {
    "use strict"
    let entityMeta = Meta.getEntityMeta(entityName)

    try {
        if (entityMeta.db === Meta.DB.mysql)
            return MysqlService.aRemoveManyByCriteria(conn,
                entityMeta, criteria)
        else if (entityMeta.db === Meta.DB.mongo)
            return MongoService.aRemoveManyByCriteria(entityMeta,
                criteria)
    } finally {
        // TODO 清除效率改进
        await EntityCache.aFireEntityRemoved(conn, entityMeta, null)
    }
}

exports.aRecoverMany = async function(conn, entityName, ids) {
    "use strict"
    let entityMeta = Meta.getEntityMeta(entityName)

    try {
        if (entityMeta.db === Meta.DB.mysql)
            return MysqlService.aRecoverMany(conn, entityMeta, ids)
        else if (entityMeta.db === Meta.DB.mongo)
            return MongoService.aRecoverMany(entityMeta, ids)
    } finally {
        await EntityCache.aFireEntityCreated(conn, entityMeta)
    }
}


exports.aFindOneById = async function(conn, entityName, id, options) {
    let entityMeta = Meta.getEntityMeta(entityName)

    options = options || {}
    let includedFields = options.includedFields || []

    let cacheId = id + "|" + options.repo + "|" + includedFields.join(",")
    let criteria = {_id: id}

    return EntityCache.aWithCache(entityMeta, ["Id", cacheId],
        async() => {
            if (entityMeta.db === Meta.DB.mysql)
                return MysqlService.aFindOneByCriteria(conn,
                    entityMeta, criteria, options)
            else if (entityMeta.db === Meta.DB.mongo)
                return MongoService.aFindOneByCriteria(entityMeta,
                    criteria, options)
        })
}

exports.aFindOneByCriteria = async function(conn, entityName, criteria,
    options) {
    let entityMeta = Meta.getEntityMeta(entityName)

    options = options || {}
    let includedFields = options.includedFields || []

    let cacheId = "OneByCriteria|" + options.repo + "|" + JSON.stringify(
        criteria) + "|" + includedFields.join(",")

    return EntityCache.aWithCache(entityMeta, ["Other", cacheId],
        async() => {
            if (entityMeta.db === Meta.DB.mysql)
                return MysqlService.aFindOneByCriteria(conn,
                    entityMeta, criteria, options)
            else if (entityMeta.db === Meta.DB.mongo)
                return MongoService.aFindOneByCriteria(entityMeta,
                    criteria, options)
        })
}

exports.aList = async function(conn, entityName, options) {
    let {
        repo, criteria, pageNo, pageSize, sort,
        includedFields, withoutTotal
    } = options
    let entityMeta = Meta.getEntityMeta(entityName)

    if (pageNo < 1) pageNo = 1
    sort = sort || {}
    criteria = criteria || {}

    let criteriaString = JSON.stringify(criteria)
    let sortString = Util.objectToKeyValuePairString(sort)
    let includedFieldsString = includedFields && includedFields.join(",")

    let cacheId =
        `List|${repo}|${pageNo}|${pageSize}|${criteriaString}|` +
        `${sortString}|${includedFieldsString}`

    return EntityCache.aWithCache(entityMeta, ["Other", cacheId],
        async() => {
            let query = {
                repo,
                entityMeta,
                criteria,
                includedFields,
                sort,
                pageNo,
                pageSize,
                withoutTotal
            }
            if (entityMeta.db === Meta.DB.mysql)
                return MysqlService.aList(conn, query)
            else if (entityMeta.db === Meta.DB.mongo)
                return MongoService.aList(query)
        })
}

exports.aFindManyByCriteria = async function(conn, entityName, options) {
    "use strict"
    options = options || {}
    options.pageSize = options.pageSize || -1
    options.withoutTotal = true

    return exports.aList(conn, entityName, options)
}

exports.aFindManyByIds = async function(conn, entityName, ids, options) {
    options = options || {}
    options.criteria = {
        __type: "relation",
        field: "_id",
        operator: "in",
        value: ids
    }
    options.pageSize = -1
    options.withoutTotal = true

    return exports.aList(conn, entityName, options)
}

exports.aWithTransaction = async function(entityMeta, aWork) {
    "use strict"
    if (entityMeta.db === Meta.DB.mysql)
        return Mysql.mysql.aWithTransaction(async conn => aWork(conn))
    else
        return aWork()
}

exports.aWithoutTransaction = async function(entityMeta, aWork) {
    "use strict"
    if (entityMeta.db === Meta.DB.mysql)
        return Mysql.mysql.aWithoutTransaction(async conn => aWork(conn))
    else
        return aWork()
}
