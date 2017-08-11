const _ = require("lodash")
const bluebird = require("bluebird")
const xml2js = require("xml2js")
const ObjectId = require("mongodb").ObjectId

const xmlBuilder = new xml2js.Builder({rootName: "xml", headless: true})
const parseXMLString = bluebird.promisify(xml2js.parseString.bind(xml2js))

exports.objectToKeyValuePairString = function(obj) {
    "use strict"
    let a = _.map(obj, (k, v) => `${k}=${v}`)
    return obj && _.join(a, "&") || ""
}

// 结果可能为 null, undefined, NaN
exports.stringToInt = function(string, alternative) {
    "use strict"
    let num = _.toInteger(string)
    if (num || num === 0) return num
    return alternative
}

// 结果可能为 null, undefined, NaN
exports.stringToFloat = function(string, alternative) {
    "use strict"
    let num = _.toNumber(string)
    if (num || num === 0) return num
    return alternative
}

exports.trimString = function(string) {
    "use strict"
    if (!string) return string
    return string.replace(/(^\s*)|(\s*$)/g, "")
}

exports.longToDate = function(long) {
    "use strict"
    if (!long) return long
    if (_.isDate(long)) return long
    return new Date(long)
}

exports.dateToLong = function(date) {
    "use strict"
    if (!date) return date
    return date.getTime()
}

// 将标准 JavaScript 语义的真假值转换为 true 或 false 两个值。
exports.toBoolean = function(v) {
    "use strict"
    return !!v
}

// 字符串 "false" 转换为 false，"true" 转换为 true，null 原样返回，其余返回 undefined
exports.stringToBoolean = function(value) {
    if (_.isBoolean(value))
        return value
    else if (value === "false")
        return false
    else if (value === "true")
        return true
    else if (_.isNull(value))
        return null
    else
        return undefined
}

exports.arrayToTrueObject = function(array) {
    if (!array) return null

    let o = {}
    for (let a of array) o[a] = true
    return o
}

// null safe, trim element
exports.splitString = function(string, s) {
    string = _.trim(string)
    if (!string) return null

    let a1 = _.split(string, s)
    let a2 = []
    for (let a of a1) {
        let i = _.trim(a)
        if (i) a2.push(i)
    }
    return a2
}

exports.setIfNone = function(object, field, alt) {
    let v = object[field]
    if (!_.isNil(v)) return v

    if (_.isFunction(alt))
        object[field] = alt()
    else
        object[field] = alt
    return object[field]
}

exports.objectToXML = object => xmlBuilder.buildObject(object)

exports.pParseXML = parseXMLString

//

exports.entityListToIdMap = function(list) {
    let map = {}
    for (let i of list) map[i._id] = i
    return map
}

exports.objectIdsEquals = function(a, b) {
    return _.isNull(a) && _.isNull(b) || a.toString() === b.toString()
}

exports.inObjectIds = function(targetId, ids) {
    for (let id of ids)
        if (id && id.toString() === targetId) return true

    return false
}

// 向 EntityHandler list 接口解析后的 criteria 添加更多条件
exports.addEqualsConditionToListCriteria = function(query, field, value) {
    if (query.criteria) {
        let criteria = query.criteria
        let item = {field, value, operator: "=="}
        if (criteria.type === "relation")
            if (criteria.relation === "and")
                query.criteria.items.push(item)
            else if (criteria.relation === "or")
                query.criteria = {
                    __type: "relation",
                    relation: "and",
                    items: [criteria, item]
                }
            else
                query.criteria = {
                    __type: "relation",
                    relation: "and",
                    items: [criteria, item]
                }
    } else {
        query.criteria = {"#{field}": value}
    }
}


exports.jsObjectToTypedJSON = function(jsObject) {
    if (!jsObject) return jsObject

    function addType(value) {
        if (_.isDate(value))
            return {_type: "Date", _value: value.getTime()}
        else if (value instanceof ObjectId)
            return {_type: "ObjectId", _value: value.toString()}
        else if (_.isObject(value))
            return {_type: "json", _value: exports.jsObjectToTypedJSON(value)}
        else
            return {_type: "", _value: value}
    }

    if (_.isArray(jsObject)) {
        let jsonArray = []
        for (let value of jsObject) jsonArray.push(addType(value))
        return jsonArray
    } else if (_.isObject(jsObject)) {
        let jsonObject = {}
        _.map(jsObject, (k, v) => jsonObject[k] = addType(v))
        return jsonObject
    } else {
        return jsObject
    }
}

exports.typedJSONToJsObject = function(jsonObject) {
    if (!jsonObject) return jsonObject

    function removeType(value) {
        switch (value._type) {
        case "Date":
            return new Date(value._value)
        case "ObjectId":
            return new ObjectId(value._value)
        case "json":
            return exports.typedJSONToJsObject(value._value)
        default:
            return value._value
        }
    }

    if (_.isArray(jsonObject)) {
        for (let value of jsonObject) removeType(value)
        return jsonObject
    } else if (_.isObject(jsonObject)) {
        let jsObject = {}
        for (let k in jsonObject) {
            let v = jsonObject[k]
            jsObject[k] = removeType(v)
        }
        return jsObject
    } else {
        return jsonObject
    }
}

exports.isUserHasFieldAction = function(user, entityName, fieldName, action) {
    "use strict"
    let acl = user.acl
    if (!acl) return false

    let aclField = acl.field
    if (!aclField) return false

    let aclFieldForEntity = aclField[entityName]
    if (!aclFieldForEntity) return false

    let aclFieldForEntityField = aclFieldForEntity[fieldName]
    if (!aclFieldForEntityField) return false

    return aclFieldForEntityField[action]
}

exports.isUserOrRoleHasFieldAction = function(user, entityName, fieldName,
    action) {
    if (!user) return false
    if (exports.isUserHasFieldAction(user, entityName, fieldName, action))
        return true
    if (user.roles)
        for (let roleName in user.roles) {
            if (user.roles.hasOwnProperty(roleName)) continue
            let role = user.roles[roleName]
            if (exports.isUserHasFieldAction(role, entityName, fieldName,
                action)) return true
        }

    return false
}

exports.keepOnlyProperties = function(object, keeps) {
    let o = {}
    for (let p of keeps) {
        o[p] = object[p]
    }
    return o
}

exports.getSingedPortedCookies = function(ctx, ...names) {
    let origin = ctx.request.origin
    let lastSepIndex = origin.lastIndexOf(":")
    let port = lastSepIndex >= 0 ?
        origin.substring(lastSepIndex + 1) :
        80
    // console.log("port", port)
    return _.map(names,
        n => ctx.cookies.get(`${n}-${port}`, {signed: true}))
}

exports.setSingedPortedCookies = function(ctx, pairs) {
    let origin = ctx.request.origin
    let lastSepIndex = origin.lastIndexOf(":")
    let port = lastSepIndex >= 0 ?
        origin.substring(lastSepIndex + 1) :
        80
    for (let name in pairs) {
        ctx.cookies.set(`${name}-${port}`, pairs[name], {signed: true})
    }
}
