const _ = require("lodash")
// const sizeof = require('object-sizeof')

const Log = require("../Log")
const Cache = require("../cache/Cache")

// 缓存分两类：1、byIdCache：根据 ID 查询单个实体。2、otherCache：其他，包括根据非 ID 查询单个实体。
// 增删改三个操作。增不影响 byIdCache；删和改影响指定 ID 的 byIdCache；
// 但增可能影响所有 otherCache。比如我们查询最新插入一个的实体，新增会导致缓存失效。更新、删除类似。
// TODO 其实还有一个"根据多个ID查询"。增不影响。修改、删除时检查被操作的ID是否在这些ID中，不在就不需要删除缓存。

const entityCreatedListeners = []
const entityUpdatedListeners = []
const entityRemovedListeners = []

exports.aWithCache = async function(entityMeta, cacheId, aQuery) {
    "use strict"
    let noServiceCache = entityMeta.noServiceCache

    if (noServiceCache)
        return aQuery()
    else {
        let keys = _.concat(["Entity", entityMeta.name], cacheId)
        // console.log("cacheId", cacheId)
        // console.log("keys", keys)
        let cacheItem = await Cache.aGetObject(keys)
        if (!_.isNil(cacheItem))
            return _.cloneDeep(cacheItem) // 返回拷贝，以防止污染缓存

        let freshValue = await aQuery()
        if (_.isNil(freshValue)) return freshValue // TODO 空值暂不缓存

        await Cache.aSetObject(keys, freshValue)
        return _.cloneDeep(freshValue) // 返回拷贝，以防止污染缓存
    }
}

exports.onEntityCreated = function(asyncListener) {
    entityCreatedListeners.push(asyncListener)
}

exports.onEntityUpdated = function(asyncListener) {
    entityUpdatedListeners.push(asyncListener)
}

exports.onEntityRemoved = function(asyncListener) {
    entityRemovedListeners.push(asyncListener)
}

exports.onUpdatedOrRemoved = function(asyncListener) {
    entityUpdatedListeners.push(asyncListener)
    entityRemovedListeners.push(asyncListener)
}

exports.aFireEntityCreated = async function(ctx, entityMeta) {
    "use strict"
    await Cache.aUnset(["Entity", entityMeta.name, "Other"])

    for (let asyncListener of entityCreatedListeners) {
        try {
            await asyncListener(ctx, entityMeta)
        } catch (e) {
            Log.system.error(e, "fireEntityCreated")
            throw e
        }
    }
}

exports.aFireEntityUpdated = async function(ctx, entityMeta, ids) {
    "use strict"
    await Cache.aUnset(["Entity", entityMeta.name, "Other"])
    await aRemoveOneCacheByIds(entityMeta, ids)

    for (let asyncListener of entityUpdatedListeners) {
        try {
            await asyncListener(ctx, entityMeta, ids)
        } catch (e) {
            Log.system.error(e, "onEntityUpdated")
            throw e
        }
    }
}

exports.aFireEntityRemoved = async function(ctx, entityMeta, ids) {
    "use strict"
    await Cache.aUnset(["Entity", entityMeta.name, "Other"])
    await aRemoveOneCacheByIds(entityMeta, ids)

    for (let asyncListener of entityRemovedListeners) {
        try {
            await asyncListener(ctx, entityMeta, ids)
        } catch (e) {
            Log.system.error(e, "onEntityRemoved")
            throw e
        }
    }
}

async function aRemoveOneCacheByIds(entityMeta, ids) {
    "use strict"
    if (ids) {
        for (let id of ids)
            await Cache.aUnset(["Entity", entityMeta.name, "Id", id])
    } else {
        await Cache.aUnset(["Entity", entityMeta.name, "Id"])
    }
}
