const Meta = require("../Meta")
const Log = require("../Log")
const Mongo = require("./Mongo")

// 在执行数据库创建指定实体的元数据
exports.aSyncWithMeta = async function() {
    "use strict"
    let entities = Meta.getEntities()
    for (let entityName in entities) {
        if (!entities.hasOwnProperty(entityName)) continue
        let entityMeta = entities[entityName]
        if (entityMeta.db !== Meta.DB.mongo) continue

        try {
            let db = await Mongo.stores[entityMeta.dbName].aDatabase()
            let tableName = entityMeta.tableName
            let c = db.collection(tableName)
            let currentIndexes = entityMeta.mongoIndexes || []
            // 创建索引
            for (let i of currentIndexes) {
                let fieldsArray = i.fields.split(",")
                let fields = {}
                for (let f of fieldsArray) {
                    let fc = f.split(":")
                    fields[fc[0]] = parseInt(fc[1], 10)
                }
                let options = {name: tableName + "_" + i.name}
                if (i.unique) options.unique = true
                if (i.sparse) options.sparse = true

                await c.createIndex(fields, options)
            }
            // TODO 删除不再需要的索引
            // 小心不要删除主键！！
            // existedIndexes = await c.listIndexes().toArray()
        } catch (e) {
            Log.system.error(e, "create mongo index", entityName)
        }
    }
}
