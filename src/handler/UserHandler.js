const Error = require('../error')
const Config = require('../Config')

const UserService = require('../security/UserService')
// const SecurityCodeService = require('../security/SecurityCodeService')

function checkPasswordFormat(password, format) {
    return format.test(password)
}

exports.checkPasswordFormat = checkPasswordFormat

exports.clearUserSessionCookies = function (ctx) {
    ctx.cookies.set('UserId', null, { signed: true, httpOnly: true })
    ctx.cookies.set('UserToken', null, { signed: true, httpOnly: true })
}

exports.aPing = async function (ctx) {
    let user = ctx.state.user
    if (user) {
        let userToFront = { userId: user._id, admin: user.admin, acl: user.acl }
        userToFront.roles = {}
        if (user.roles) {
            for (let roleId of user.roles) {
                let role = await UserService.aRoleById(roleId)
                userToFront.roles[role.name] = role
            }
        }
        ctx.body = userToFront
    } else {
        ctx.status = 401
    }
}

// 用户登录接口
exports.aSignIn = async function (ctx) {
    let req = ctx.request.body
    if (!(req.username && req.password)) return ctx.status = 400

    let origin = ctx.request.origin
    let session = await UserService.aSignIn(origin, req.username, req.password)
    ctx.body = { userId: session.userId }

    ctx.cookies.set('UserId', session.userId,
        { signed: true, httpOnly: true })
    ctx.cookies.set('UserToken', session.userToken,
        { signed: true, httpOnly: true })
}

// 登出接口
exports.aSignOut = async function (ctx) {
    await UserService.aSignOut(ctx.request.origin, ctx.state.userId)

    // 清cookies
    exports.clearUserSessionCookies(this)

    ctx.status = 204
}

// 用户修改密码接口
exports.aChangePassword = async function (ctx) {
    let req = ctx.request.body

    if (!checkPasswordFormat(req.newPassword, Config.passwordFormat))
        throw new Error.UserError('BadPasswordFormat')

    await UserService.aChangePassword(ctx.state.user._id,
        req.oldPassword, req.newPassword)

    // 清cookies
    exports.clearUserSessionCookies(this)

    ctx.status = 204
}

// # 通过手机/email重置密码
// # phone/email, password, securityCode
// exports.gResetPassword = ->
//     req = ctx.request.body
//
//     unless checkPasswordFormat(req.password, config.passwordFormat)
//         throw new errors.UserError('BadPasswordFormat')
//
//     if req.phone?
//         SecurityCodeService.check(req.phone, req.securityCode)
//         await UserService.gResetPasswordByPhone(req.phone, req.password)
//     else if req.email?
//         SecurityCodeService.check(req.email, req.securityCode)
//         await UserService.gResetPasswordByEmail(req.email, req.password)
//     else
//         ctx.status = 400
//
//     ctx.status = 204
//
// # 用户修改手机接口
// exports.gChangePhone = ->
//     req = ctx.request.body
//
//     # 检查验证码
//     SecurityCodeService.check(req.phone, req.securityCode)
//
//     await UserService.gChangePhone(ctx.state.user._id, req.phone)
//
//     ctx.status = 204
//
// # 用户修改 Email
// exports.gChangeEmail = ->
//     req = ctx.request.body
//
//     # 检查验证码
//     SecurityCodeService.check(req.email, req.securityCode)
//
//     await UserService.gChangeEmail(ctx.state.user._id, req.email)
//
//     ctx.status = 204
//
