const mongodb = require("mongodb")
const ObjectId = mongodb.ObjectId
const MongoClient = mongodb.MongoClient

const Log = require("../Log")
const Config = require("../Config")

class MongoStore {
    constructor(name, url) {
        this.name = name
        this.url = url
    }

    async aDatabase() {
        if (this.db) return this.db

        this.db = await MongoClient.connect(this.url)

        this.db.on("close", () => {
            this.db = null
            Log.system.info(`MongoDB [${this.name}] closed`)
        })

        this.db.on("error", e => {
            this.db = null
            Log.system.error(e, `MongoDB [${this.name}] error`)
        })

        this.db.on("reconnect", () => {
            Log.system.info(`Mongo DB [${this.name}] reconnect`)
        })

        return this.db
    }

    async aDispose() {
        Log.system.info(`Closing mongodb [${this.name}]...`)
        if (!this.db) return

        try {
            await this.db.close()
        } catch (e) {
            Log.system.error(e, `Error on disposing mongodb [${this.name}]`)
        }
    }
}

exports.stores = {}

exports.init = function() {
    "use strict"
    if (!Config.mongoDatabases) {
        Log.system.warn("No mongo!")
        return
    }
    for (let db of Config.mongoDatabases) {
        exports.stores[db.name] = new MongoStore(db.name, db.url)
    }
}

exports.aDispose = async function() {
    "use strict"
    for (let db in exports.stores) {
        if (!exports.stores.hasOwnProperty(db)) continue
        await exports.stores[db].aDispose()
    }
}

// 返回值是ObjectId
exports.getInsertedIdObject = function(r) {
    return r && r.insertedId || null
}

exports.getUpdateResult = function(r) {
    return r && {matchedCount: r.matchedCount, modifiedCount: r.modifiedCount}
}

exports.isIndexConflictError = function(e) {
    return e.code === 11000
}

exports.stringToObjectId = function(string) {
    if (!string) return string

    if (string instanceof ObjectId)
        return string
    else
        return new ObjectId(string)
}

// 如果无法解析 ObjectID 返回 undefined；如果本身是 null/undefined 原样返回
exports.stringToObjectIdSilently = function(string) {
    try {
        return exports.stringToObjectId(string)
    } catch (e) {
        return undefined
    }
}

// 忽略无法解析的
exports.stringArrayToObjectIdArraySilently = function(stringArray) {
    if (!stringArray) return []

    let ids = []
    for (let s of stringArray) {
        let id = exports.stringToObjectIdSilently(s)
        if (id) ids.push(id)
    }
    return ids
}

// 将通用查询转转换为 mongo 的查询对象
exports.toMongoCriteria = function(criteria) {
    if (!criteria) return {}

    let __type = criteria.__type
    delete criteria.__type

    let mongoCriteria = {}

    switch (__type) {
    case "mongo":
        return criteria
    case "relation":
        toMongoCriteria(criteria, mongoCriteria)
        return mongoCriteria
    default:
        return criteria
    }
}

function toMongoCriteria(criteria, mongoCriteria) {
    if (!criteria) return

    if (criteria.relation === "or") {
        let items = []
        for (let item of criteria.items) {
            let mc = {}
            toMongoCriteria(item, mc)
            if (mc) items.push(mc)
        }
        mongoCriteria.$or = items
    } else if (criteria.relation === "and") {
        for (let item of criteria.items)
            toMongoCriteria(item, mongoCriteria)
    } else if (criteria.field) {
        let operator = criteria.operator
        let value = criteria.value
        let field = criteria.field
        let fc = mongoCriteria[field] = mongoCriteria[field] || {}
        switch (operator) {
        case "==":
            mongoCriteria[field] = value
            break
        case "!=":
            // TODO 对于部分运算符要检查 comparedValue 不为 null/undefined/NaN
            fc.$ne = value
            break
        case ">":
            fc.$gt = value
            break
        case ">=":
            fc.$gte = value
            break
        case "<":
            fc.$lt = value
            break
        case "<=":
            fc.$lte = value
            break
        case "in":
            fc.$in = value
            break
        case "nin":
            fc.$nin = value
            break
        case "start":
            fc.$regex = "^" + value
            break
        case "end":
            fc.$regex = value + "$"
            break
        case "contain":
            fc.$regex = value
        }
    }
}

// (async function () {
//     "use strict"
//
//     Log.config({})
//
//     Config.mongoDatabases = [
//         {name: "main", url: 'mongodb://localhost:27017/fcms-ch'},
//         {name: "bp", url: 'mongodb://localhost:27017/bp'}
//     ]
//
//     exports.init()
//
//     try {
//         let db = await exports.stores.main.aDataDatabase()
//         let user = await db.collection("F_User").findOne()
//         Log.system.info("user", user)
//
//         db = await exports.stores.bp.aDataDatabase()
//         user = await db.collection("F_User").findOne()
//         Log.system.info("user", user)
//     } catch (e) {
//         Log.system.error(e)
//     } finally {
//         await exports.aDispose()
//     }
//
// })()
