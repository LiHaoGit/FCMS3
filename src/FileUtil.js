const fs = require('fs')
const path = require('path')
const Promise = require('bluebird')

const pMakeDir = Promise.promisify(require('mkdirp'))

exports.pUnlink = Promise.promisify(fs.unlink)

const pRename = Promise.promisify(fs.rename)

const pStat = Promise.promisify(fs.stat)

const Log = require('./Log')

exports.aMoveFileTo = async function (oldName, newName) {
    let targetDir = path.dirname(newName)
    let stats
    try {
        stats = await pStat(targetDir)
    } catch (e) {
        Log.system.error(e, 'pStat')
    }

    if (!(stats && stats.isDirectory()))
        await pMakeDir(targetDir)

    await pRename(oldName, newName)
}
exports.aFileExists = async function (fileFullPath) {
    try {
        await pStat(fileFullPath)
        return true
    } catch (e) {
        if (e.code === 'ENOENT') return false
        throw e
    }
}