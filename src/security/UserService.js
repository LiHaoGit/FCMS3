const chance = new require("chance")()
const _ = require("lodash")

const Errors = require("../Errors")
const Log = require("../Log")
const Meta = require("../Meta")
const Config = require("../Config")
const Util = require("../Util")
const Cache = require("../cache/Cache")

const EntityService = require("../service/EntityService")

const PermissionService = require("./PermissionService")

const cacheKeyRoot = "user"

exports.init = function() {
    let EntityServiceCache = require("../service/EntityServiceCache")
    EntityServiceCache.onUpdatedOrRemoved(async(ctx, entityMeta, ids) => {
        if (entityMeta.name === "F_User") {
            if (ids)
                await Cache.aUnset([cacheKeyRoot, "user"], ids)
            else
                await Cache.aUnset([cacheKeyRoot, "user"])
        } else if (entityMeta.name === "F_UserRole") {
            await Cache.aUnset([cacheKeyRoot], ["anonymousRole"])

            if (ids)
                await Cache.aUnset([cacheKeyRoot, "role"], ids)
            else
                await Cache.aUnset([cacheKeyRoot, "role"])
        }
    })
}

exports.aUserById = async function(id) {
    let user = await Cache.aGetObject([cacheKeyRoot, "user", id])
    if (user) return user

    user = await EntityService.aFindOneByCriteria({}, "F_User", {_id: id})
    if (user) {
        PermissionService.permissionArrayToMap(user.acl)
        await Cache.aSetObject([cacheKeyRoot, "user", id], user)
    }

    return user
}

exports.aRoleById = async function(id) {
    let role = await Cache.aGetObject([cacheKeyRoot, "role", id])
    if (role) return role

    role = await EntityService.aFindOneByCriteria({}, "F_UserRole", {_id: id})
    if (role) {
        PermissionService.permissionArrayToMap(role.acl)
        await Cache.aSetObject([cacheKeyRoot, "role", id], role)
    }
    return role
}

exports.aRoleIdByName = async function(name) {
    let role = await EntityService.aFindOneByCriteria({},
        "F_UserRole", {name}, {includeFields: ["_id"]})
    return role && role._id
}

exports.aAddRemoveRoleNameToUser = async function(userId, addRoles,
    removeRoles) {
    if (!(addRoles || removeRoles)) return

    let user = await exports.aUserById(userId)
    let roles = user.roles || []

    if (addRoles) {
        let addRoleIds = await Promise.all(_.map(addRoles,
            name => exports.aRoleIdByName(name)))

        for (let id of addRoleIds)
            if (!Util.inObjectIds(id, roles)) roles.push(id)
    }
    if (removeRoles) {
        let removeRoleIds = await Promise.all(_.map(removeRoles,
            name => exports.aRoleIdByName(name)))
        let roles2 = []
        for (let id of roles)
            if (!Util.inObjectIds(id, removeRoleIds)) roles2.push(id)
        roles = roles2
    }

    await EntityService.aUpdateOneByCriteria({},
        "F_User", {_id: userId}, {roles})
    await Cache.aUnset([cacheKeyRoot, "user"], [userId])
}

exports.aGetAnonymousRole = async function() {
    let anonymousRole = await Cache.aGetObject([cacheKeyRoot, "anonymousRole"])
    if (anonymousRole) return anonymousRole

    let role = await EntityService.aFindOneByCriteria({},
        "F_UserRole", {name: "anonymous"})
    if (role) {
        PermissionService.permissionArrayToMap(role.acl)
        await Cache.aSetObject([cacheKeyRoot, "anonymousRole"], role)
    }
    return role
}

exports.aAuthToken = async function(origin, userId, userToken) {
    let session = await EntityService.aFindOneByCriteria({},
        "F_UserSession", {origin, userId})
    if (!session) return false

    if (session.userToken !== userToken) {
        Log.debug("token not match", {
            userId,
            userToken,
            sessionUserToken: session.userToken
        })
        return false
    }

    if (session.expireAt < Date.now()) {
        Log.debug("token expired", {userId, expireAt: session.expireAt})
        return false
    }

    return exports.aUserById(userId)
}

// 登录
// TODO 思考：如果用户之前登录此子应用的 session 未过期，是返回之前的 session 还是替换 session
exports.aSignIn = async function(origin, username, password) {
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

    let session = await exports.aSignInSuccessfully(origin, user)

    return session
}

exports.aSignInSuccessfully = async function(origin, user) {
    let session = {}
    session.origin = origin
    session.userId = user._id
    session.userToken = chance.string({length: 24})
    session.expireAt = Date.now() + Config.sessionExpireAtServer

    await exports.aSignOut(origin, user._id) // 先退出
    await EntityService.aCreate({}, "F_UserSession", session)

    return session
}

// 登出
exports.aSignOut = async function(origin, userId) {
    let criteria = {userId, origin}
    await EntityService.aRemoveManyByCriteria({}, "F_UserSession", criteria)
}

// 添加用户（核心信息）
exports.aAddUser = async function(userInput) {
    let user = {
        _id: Meta.newObjectId().toString(), // 用户 ID 同一直接用字符串
        password: Meta.hashPassword(userInput.password)
    }

    if (userInput.username) user.username = userInput.username
    if (userInput.phone) user.phone = userInput.phone
    if (userInput.email) user.email = userInput.email

    await EntityService.aCreate({}, "F_User", user)
}

// 修改绑定的手机
// exports.gChangePhone = (userId, phone)->
//     user = await EntityService.gFindOneByCriteria({}, 'F_User', {_id: userId})
//     throw new error.UserError("UserNotExisted") unless user?
//     throw new error.UserError("UserDisabled") if user.disabled
//
//     await EntityService.gUpdateOneByCriteria({}, 'F_User', {_id: userId, _version: user._version}, {phone: phone})
//
//     await Cache.gUnset [cacheKeyRoot, 'user'], [userId]
//
// 修改绑定的邮箱
// exports.gChangeEmail = (userId, email)->
//     user = await EntityService.gFindOneByCriteria({}, 'F_User', {_id: userId})
//     throw new error.UserError("UserNotExisted") unless user?
//     throw new error.UserError("UserDisabled") if user.disabled
//
//     await EntityService.gUpdateOneByCriteria({}, 'F_User', {_id: userId, _version: user._version}, {email: email})
//
//     await Cache.gUnset [cacheKeyRoot, 'user'], [userId]
//
// 修改密码
exports.aChangePassword = async function(userId, oldPassword, newPassword) {
    let user = await EntityService.aFindOneByCriteria({},
        "F_User", {_id: userId})
    if (!user) throw new Errors.UserError("UserNotExisted")
    if (user.disabled) throw new Errors.UserError("UserDisabled")
    if (Meta.hashPassword(oldPassword) !== user.password)
        throw new Errors.UserError("PasswordNotMatch")

    let update = {password: Meta.hashPassword(newPassword)}
    await EntityService.aUpdateOneByCriteria({},
        "F_User", {_id: userId, _version: user._version}, update)

    await aRemoveAllUserSessionOfUser(userId)
}
//
// 通过手机重置密码
// exports.gResetPasswordByPhone = (phone, password)->
//     user = await EntityService.gFindOneByCriteria({}, 'F_User', {phone: phone})
//     throw new error.UserError("UserNotExisted") unless user?
//     throw new error.UserError("UserDisabled") if user.disabled
//
//     update = {password: Meta.hashPassword(password)}
//     await EntityService.gUpdateOneByCriteria({}, 'F_User', {_id: user._id, _version: user._version}, update)
//
//     await _gRemoveAllUserSessionOfUser user._id
//
// # 通过邮箱重置密码
// exports.gResetPasswordByEmail = (email, password)->
//     user = await EntityService.gFindOneByCriteria({}, 'F_User', {email: email})
//     throw new error.UserError("UserNotExisted") unless user?
//     throw new error.UserError("UserDisabled") if user.disabled
//
//     update = {password: Meta.hashPassword(password)}
//     await EntityService.gUpdateOneByCriteria({}, 'F_User', {_id: user._id, _version: user._version}, update)
//
//     await _gRemoveAllUserSessionOfUser user._id
//

exports.checkUserHasRoleId = function(user, roleId) {
    roleId = roleId.toString()
    if (user.roles)
        for (let r of user.roles) if (r._id.toString() === roleId) return true
    return false
}

async function aRemoveAllUserSessionOfUser(userId) {
    return EntityService.aRemoveManyByCriteria({},
        "F_UserSession", {useId: userId})
}
