const chance = new require("chance")()
// const Promise = require('bluebird')
// const request = require('request')
// const pRequestPost = Promise.promisify(request.post.bind(request))

const Errors = require("../Errors")
const Cache = require("../cache/Cache")
const MailService = require("./MailService")

// 验证验证码
exports.aCheck = async function(target, code) {
    let expectedCode = await Cache.aGetString(["securityCodes", target])

    if (!(expectedCode && expectedCode.code === code))
        throw new Errors.UserError("SecurityCodeNotMatch")
    if (Date.now() - expectedCode.sendTime > 15 * 60 * 1000)
        throw new Errors.UserError("SecurityCodeExpired") // 过期

    await Cache.aUnset(["securityCodes"], [target])
}

// 发送验证码到邮箱
exports.aSendSecurityCodeToEmail = async function(toEmail, subject, purpose) {
    let code = await aGenerateSecurityCode(toEmail)
    return MailService.aSendEmail(toEmail, subject,
        `您好，本次操作的验证码是 ${code}。${purpose}。`)
}

// TODO 发送验证码到手机
// gSendSecurityCodeToPhone = (phone, purpose)->
//     code = @_generateSecurityCode(phone)
//
//     message = new Buffer("@1@=#{purpose},@2@=#{code}", 'utf8').toString('utf8')
//
//     postData =
//         method: "sendUtf8Msg"
//         username: config.sms.username
//         password: config.sms.password
//         veryCode: config.sms.veryCode
//         mobile: phone
//         content: message,
//         msgtype: 2
//         tempid: config.sms.template,
//         code: "utf-8"
//
//     r = yield requestPost config.sms.url, {
//         form: postData,
//         headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'}
//     }
//     return r.body?.match('<status>0</status>')?.length > 0
//

async function aGenerateSecurityCode(address) {
    let code = chance.string({length: 6, pool: "0123456789"})
    await Cache.aSetString(["securityCodes", address],
        {code: code, sendTime: new Date().getTime()})
    return code
}
