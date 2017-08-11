exports.serverPort = 7090
exports.cookieKey = ""
exports.serverPugPath = ""
exports.uploadPath = ""

exports.httpBodyMaxFieldsSize = 6 * 1024 * 1024
exports.fileDefaultMaxSize = 6 * 1024 * 1024
exports.imageDefaultMaxSize = 2 * 1024 * 1024

exports.sessionExpireAtServer = 1000 * 60 * 60 * 24 * 15 //  15 day
exports.usernameFields = ["username"]

exports.mongoDatabases = [{
    name: "main",
    url: "mongodb://localhost:27017/demo"
}]

exports.mysql = null

exports.mail = null

exports.passwordFormat = /^([a-zA-Z0-9]){8,20}$/

exports.emailOrg = ""

exports.fileDir = ""

exports.errorCatcher = null

exports.fileDownloadPrefix = "/r/"

exports.elasticSearchEndpoint = ""

exports.asSSOServer = false

exports.asSSOClient = false

exports.cluster = false
exports.workerNum = 2

exports.ssoServer = null
