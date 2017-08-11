const Redis = require("../storage/Redis")
const _ = require("lodash")

const Log = require("../Log")
const Util = require("../Util")

const keySeparator = ":"

// keysArray 是数组，表示缓存键的各部分
async function aGet(keysArray, alternative) {
    let key = keysArray.join(keySeparator)
    let value = await Redis.client.getAsync(key)
    return _.isNil(value) ? alternative : value
}

// keysArray 是数组，表示缓存键的各部分
async function aSet(keysArray, value) {
    let key = keysArray.join(keySeparator)
    await Redis.client.setAsync(key, value)
}

exports.aGetString = aGet
exports.aSetString = aSet

exports.aGetCachedString = aGet
exports.aSetCachedString = aSet

exports.aGetObject = async function(keysArray, alternative) {
    let str = await aGet(keysArray, alternative)
    let json = str && JSON.parse(str)
    return Util.typedJSONToJsObject(json)
}

exports.aSetObject = async function(keysArray, value) {
    value = Util.jsObjectToTypedJSON(value)
    let str = value && JSON.stringify(value)
    await aSet(keysArray, str)
}

// keysArray, lastKeys 都是数组
// 例如 aUnset(["a","b"],["1","2"] 可以删除键 "a.b.1" 和 "a.b.2"
exports.aUnset = async function(keysArray, lastKeys) {
    if (lastKeys && lastKeys.length) {
        keysArray = _.clone(keysArray)
        let keysLength = keysArray.length
        let keys2 = []
        for (let lastKey of lastKeys) {
            keysArray[keysLength] = lastKey
            keys2.push(keysArray.join(keySeparator))
        }
        keysArray = keys2
    } else {
        let key = keysArray.join(keySeparator) + "*"
        keysArray = await Redis.client.keysAsync(key)
    }

    Log.debug("unset redis keys", keysArray)

    if (keysArray.length) await Redis.client.delAsync(keysArray)
}

exports.aClearAllCache = async function() {
    const keys = await Redis.client.keysAsync("*")
    if (keys.length) await Redis.client.delAsync(keys)
}

// (async function () {
//     Log.config({})
//     Redis.init()
//
//     await exports.aSetObject(['aaa'], {a: 1, time: new Date(), aaa: [4, 5]})
//
//     let v = await exports.aGetObject(['aaa'])
//     console.log(v)
//     await exports.aUnset(["a"], [1, 2, 3, 4])
//
// })().catch((e) => Log.system.error(e, 'test'))
