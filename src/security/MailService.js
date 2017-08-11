const nodemailer = require("nodemailer")
const bluebird = require("bluebird")

const Config = require("../Config")

let pSendMail = null

exports.aSendEmail = async function(to, subject, content) {
    if (!Config.mail) throw new Error("无发信机制")
    let mailOptions = {from: Config.mail.user, to, subject, text: content}
    await prepareSender()(mailOptions)
}

function prepareSender() {
    if (pSendMail) return pSendMail

    let transporter = nodemailer.createTransport({
        host: Config.mail.host,
        port: Config.mail.port,
        auth: {user: Config.mail.user, pass: Config.mail.password}
    })
    pSendMail = bluebird.promisify(transporter.sendMail.bind(transporter))
    return pSendMail
}
