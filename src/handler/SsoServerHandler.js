const chance = new require("chance")()
const {URL} = require("url")

const Meta = require("../Meta")
const Log = require("../Log")
const Config = require("../Config")
const Errors = require("../Errors")
const EntityService = require("../service/EntityService")

// SSO 客户端请求该接口
// 如果 SSO 已登录，则产生一个 TOKEN 回调客户端校验 TOKEN 的接口
// 如果 SSO 没有登录，则让客户端跳转到 SSO 登录页
exports.aAuth = async function(ctx) {
    let userId = ctx.cookies.get("SsoUserId", {signed: true})
    let userToken = ctx.cookies.get("SsoUserToken", {signed: true})

    let callback = ctx.query.callback
    if (!callback)
        throw new Errors.UserError("MissingCallback", "Missing Callback")
    let encodedCallback = encodeURIComponent(callback)

    let session = await aValidSsoSession(userId, userToken)
    if (!session) {
        let redirect = ctx.request.origin +
            `/sso/sign-in?callback=${encodedCallback}`
        ctx.redirect(redirect)
        return
    }

    let callbackUrl = new URL(callback)
    let callbackOrigin = callbackUrl.origin // http://www.baidu.com:80
    let clientConfig = Config.ssoServer.clients[callbackOrigin]
    if (!clientConfig)
        throw new Errors.UserError("UnkownClient",
            "Unkown Client: " + callbackOrigin)

    let {acceptTokenUrl} = clientConfig

    let token = await aNewClientToken(callbackOrigin, userId)
    token = encodeURIComponent(token)

    acceptTokenUrl += `?callback=${encodedCallback}&token=${token}`
    ctx.redirect(acceptTokenUrl)
}

// SSO 前端页面请求登录
exports.aSignIn = async function(ctx) {
    let req = ctx.request.body
    if (!(req.username && req.password)) return ctx.status = 400

    let session = await aSignIn(req.username, req.password)
    // Log.debug('sso sign in', session)
    ctx.body = {userId: session.userId}

    ctx.cookies.set("SsoUserId", session.userId,
        {signed: true, httpOnly: true})
    ctx.cookies.set("SsoUserToken", session.userToken,
        {signed: true, httpOnly: true})
}

// 校验 SSO 客户端接受到的 TOKEN 的真实性
exports.aValidateToken = async function(ctx) {
    let req = ctx.request.body
    if (!req) return ctx.status = 400

    let clientConfig = Config.ssoServer.clients[req.origin]
    if (!clientConfig)
        throw new Errors.UserError("UnkownClient",
            "Unkown Client: " + req.origin)
    // 校验客户端的通信密钥
    if (clientConfig.key !== req.key)
        throw new Errors.UserError("BadClientKey", "Bad Client Key")

    let ct = await EntityService.aFindOneByCriteria({},
        "F_SsoClientToken", {origin: req.origin, token: req.token})
    if (!ct) throw new Errors.UserError("BadToken", "Bad Token")

    // 只能用一次，检验后就删除
    await EntityService.aRemoveManyByCriteria({}, "F_SsoClientToken",
        {_id: ct._id})

    // 判断是否过期
    if (Date.now() - ct._createdOn.getTime() > 10000)
        throw new Errors.UserError("TokenExpired", "Token Expired")

    ctx.body = {userId: ct.userId}
}

exports.aSignOut = async function(ctx) {
    let userId = ctx.cookies.get("SsoUserId", {signed: true})
    let userToken = ctx.cookies.get("SsoUserToken", {signed: true})

    let callback = ctx.query.callback
    if (!callback)
        throw new Errors.UserError("MissingCallback", "Missing Callback")
    let encodedCallback = encodeURIComponent(callback)

    let session = await aValidSsoSession(userId, userToken)
    if (!session) {
        ctx.status = 401
        return
    }

    // 退出 SSO
    await aSignOut(userId)

    // 退出所有客户端
    await EntityService.aRemoveManyByCriteria({}, "F_UserSession",
        {userId: userId})

    let redirect = ctx.request.origin +
            `/sso/sign-in?callback=${encodedCallback}`
    ctx.redirect(redirect)
}

async function aValidSsoSession(userId, userToken) {
    let session = await EntityService.aFindOneByCriteria({},
        "F_SsoSession", {userId})
    if (!session) return false

    if (session.userToken !== userToken) {
        let errObj = {userId, userToken, sessionUserToken: session.userToken}
        Log.debug("token not match", errObj)
        return false
    }

    if (session.expireAt < Date.now()) {
        // Log.debug('token expired', { userId, expireAt: session.expireAt })
        return false
    }
    return session
}

// origin 的形式是 http://www.baidu.com:80
async function aNewClientToken(origin, userId) {
    let token = chance.string({length: 24})

    // TODO 记录客户浏览器的 IP，记录此 TOKEN 授予的 IP
    let ct = {userId, origin, token, _createdOn: new Date()}
    await EntityService.aCreate({}, "F_SsoClientToken", ct)
    return token
}

async function aSignIn(username, password) {
    if (!password) throw new Errors.UserError("PasswordNotMatch")

    let usernameFields = Config.usernameFields
    if (!(usernameFields && usernameFields.length))
        usernameFields = ["username", "phone", "email"]

    let matchFields = []
    for (let f of usernameFields)
        matchFields.push({field: f, operator: "==", value: username})
    let criteria = {__type: "relation", relation: "or", items: matchFields}

    let user = await EntityService.aFindOneByCriteria({}, "F_User", criteria)

    if (!user) throw new Errors.UserError("UserNotExisted")
    if (user.disabled) throw new Errors.UserError("UserDisabled")
    if (Meta.hashPassword(password) !== user.password)
        throw new Errors.UserError("PasswordNotMatch")

    let session = {}
    session.userId = user._id
    session.userToken = chance.string({length: 24})
    session.expireAt = Date.now() + Config.sessionExpireAtServer

    await aSignOut(user._id) // 先退出
    await EntityService.aCreate({}, "F_SsoSession", session)

    return session
}

async function aSignOut(userId) {
    let criteria = {userId}
    await EntityService.aRemoveManyByCriteria({}, "F_SsoSession", criteria)
}
