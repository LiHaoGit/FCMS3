// 匹配多个路由时，无变量路由直接胜出（至多只能有一个无变量的路由）。
// 有变量的路由，URL不同的部分，最先出现非变量路径的胜出。
// 如 abc/def/:1/ghi 比 abc/def/:1/:2 胜出。

const compose = require('koa-compose')
const _ = require('lodash')

const Log = require('../Log')
const Util = require('../Util')

const routes = {}
let rootMapping = {}

// mapping[method][length][index]
// 如 mapping['get'] 是所有 get 的映射
// mapping['get'][3] 是所有有三段路径的映射，如 /user/:name/detail
// mapping['get'][3][i] 是第 i 段的映射， 0 <= i < 3
let mapping = {}

class RouteRuleRegisters {
    constructor(urlPrefix, errorCatcher) {
        this.errorCatcher = errorCatcher
        if (!urlPrefix) throw new Error('urlPrefix cannot be empty')
        // 去掉后缀的斜线
        if (urlPrefix[urlPrefix.length - 1] === '/')
            urlPrefix = urlPrefix.substring(0, urlPrefix.length - 1)
        this.urlPrefix = urlPrefix
    }

    add(method, url, info, ...handlers) {
        // 去掉 url 开头的斜线
        if (url === '' || url === '/') url = ''
        else if (url[0] === '/') url = url.substring(1)

        url = this.urlPrefix + "/" + url
        // Log.debug('url', url)

        info = info || {}
        info.errorCatcher = this.errorCatcher
        info.urlPrefix = this.urlPrefix
        addRouteRules(method, url, info, ...handlers)
    }

    get(url, info, ...handlers) {
        this.add('get', url, info, ...handlers)
    }

    post(url, info, ...handlers) {
        this.add('post', url, info, ...handlers)
    }

    put(url, info, ...handlers) {
        this.add('put', url, info, ...handlers)
    }

    del(url, info, ...handlers) {
        this.add('delete', url, info, ...handlers)
    }
}

exports.RouteRuleRegisters = RouteRuleRegisters

exports.refresh = function () {
    "use strict"
    rootMapping = {}
    mapping = {}

    for (let key in routes) {
        if (!routes.hasOwnProperty(key)) continue

        let route = routes[key]
        let url = route.url
        let method = route.method

        Log.debug(`route ${method} ${url}`)
        route.indexToVariable = {}

        if (url === '' || url === '/')
            rootMapping[method] = url
        else {
            let parts = splitPath(url)
            let partsLength = parts.length
            let mOfMethod = Util.setIfNone(mapping, method, {})
            let mOfLength = Util.setIfNone(mOfMethod, partsLength, [])

            let routeWeight = 0
            for (let index = 0; index < partsLength; index++) {
                let part = parts[index]
                let mOfIndex = Util.setIfNone(mOfLength, index,
                    { terms: {}, variable: [] })

                if (part[0] === ':') {
                    let name = part.slice(1)
                    route.indexToVariable[name] = index
                    mOfIndex.variable.push(url)
                } else {
                    let mOfTerm = Util.setIfNone(mOfIndex.terms, part, [])
                    mOfTerm.push(url)
                    routeWeight = routeWeight + (1 << (partsLength - index - 1))
                }
            }

            route.routeWeight = routeWeight

            // Log.debug(JSON.stringify(routes, null, 4))
        }
    }
    // Log.system.info('routes: ' + _.size(routes))
}

// 解析意图
exports.aParseRoute = async function (ctx, next) {
    let path = decodeURI(ctx.request.path)
    // Log.debug('parse route, path = ' + path)

    let params = {}
    let route = match(ctx.request.method, path, params)
    if (route) {
        ctx.params = params
        ctx.route = route
        await next()
    } else {
        Log.debug('Fail to match route',
            { method: ctx.request.method, path: path })
        ctx.status = 404
    }
}

// 执行路由的处理器
exports.aHandleRoute = async function (ctx, next) {
    await ctx.route.handler(ctx, next)
}

// 所有匹配 part 单词或变量的路由的 URL
function collectRouteUrls(mOfIndex, part) {
    let routeUrlMap = {}
    let routeUrls = mOfIndex.terms[part]
    if (routeUrls) for (let u of routeUrls) routeUrlMap[u] = true

    routeUrls = mOfIndex.variable
    if (routeUrls) for (let u of routeUrls) routeUrlMap[u] = true
    return routeUrlMap
}

function match(method, path, params) {
    method = method.toLowerCase()

    // Log.debug("path", path)

    let parts = splitPath(path)
    if (path === '' || path === '/') {
        let routeUrl = rootMapping[method]
        if (!routeUrl) return null // 不匹配
        return routes[method + routeUrl]
    } else {
        let mOfLength = mapping[method] && mapping[method][parts.length]
        if (!mOfLength) return null // 不匹配
        let possibleRouteUrl = {} // 所有可能匹配的路由的 URL
        let partsLength = parts.length
        for (let index = 0; index < partsLength; index++) {
            let part = parts[index]
            let mOfIndex = mOfLength[index]
            if (!mOfIndex) return null // 不匹配
            if (index === 0) {
                // 初始集合
                possibleRouteUrl = collectRouteUrls(mOfIndex, part)
            } else {
                let newPossibleRouteUrl = collectRouteUrls(mOfIndex, part)
                // 取交集
                for (let u in possibleRouteUrl)
                    !newPossibleRouteUrl[u] && delete possibleRouteUrl[u]
            }
            if (!_.size(possibleRouteUrl)) return null
        }

        // 如果有多个匹配，变量出现位置靠后的胜出（没有变量的最胜）
        let maxRouteWeight = 0
        let finalRoute = null
        for (let routeUrl in possibleRouteUrl) {
            let route = routes[method + routeUrl]
            if (route.routeWeight > maxRouteWeight) {
                finalRoute = route
                maxRouteWeight = route.routeWeight
            }
        }

        for (let name in finalRoute.indexToVariable) {
            let index = finalRoute.indexToVariable[name]
            params[name] = parts[index]
        }
        return finalRoute
    }
}

// test = ->
//     exports.addRouteRules('get', "/", {action: "index"}, (next)-> true)
//     exports.addRouteRules('get', "/home", {action: "home"}, (next)-> true)
//     exports.addRouteRules('get', "/meta", {action: "meta"}, (next)-> true)
//     exports.addRouteRules('post', "/meta", {action: "meta"}, (next)-> true)
//     exports.addRouteRules('put', "/meta/:name", {action: "meta"},
//         (next)-> true)
//     exports.addRouteRules('put', "/meta/_blank", {action: "meta"},
//         (next)-> true)
//     exports.addRouteRules('put', "/meta/:name/fields", {action: "meta"},
//         (next)-> true)
//     exports.addRouteRules('get', "/entity/:name/:id", {action: "entity"},
//         (next)-> true)
//     exports.refresh()
//
//     #log.debug JSON.stringify(rootMapping, null, 4)
//     log.debug("pathTree", JSON.stringify(mapping, null, 4))
//
//     params = {}
//     console.log(match('get', '/entity/User/1', params), params)

// 将路径切分，去首尾空（去掉首尾的斜线）
function splitPath(aPath) {
    let parts = aPath.split("/")
    let partsStart = parts[0] ? 0 : 1
    let partsEnd = parts[parts.length - 1] ? parts.length : parts.length - 1
    return parts.slice(partsStart, partsEnd)
}

function addRouteRules(method, url, info, ...handlers) {
    let key = method + url
    let handler = handlers.length === 1 ? handlers[0] : compose(handlers)
    routes[key] = { method, url, info, handler, indexToVariable: {} }
}
