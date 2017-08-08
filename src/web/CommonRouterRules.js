const Meta = require('../Meta')
const Config = require('../Config.js')

const actions = {
    ReadMeta: '读取元数据',
    WriteMeta: '修改元数据',
    ChangePhone: '修改绑定手机接口',
    ChangeEmail: '修改绑定邮箱接口',
    PreFilters: '管理预定义查询',
    Upload: '文件上传',
    RichTextUpload: '富文本编辑器文件上传',
    ES: '配置搜索引擎',
    Promotion: '推广活动',
    ViewCache: '查看缓存',
    ClearEntityCache: '清除实体缓存'
}

Object.assign(Meta.actions, actions)

exports.addCommonRouteRules = function (RouteRuleRegisters) {
    const rrr = new RouteRuleRegisters('/c', Config.errorCatcher)
    // ======================================
    // 元数据管理
    // ======================================
    let MetaHandler = require('../handler/MetaHandler')

    rrr.get('/meta', { action: 'ReadMeta' }, MetaHandler.aGetAllMeta)
    rrr.get('/meta-empty', { action: 'WriteMeta' },
        MetaHandler.aGetEmptyEntityMeta)
    rrr.get('/meta/:type/:name', { action: 'ReadMeta' }, MetaHandler.aGetMeta)
    rrr.put('/meta/:type/:name', { action: 'WriteMeta' }, MetaHandler.aSaveMeta)
    rrr.post('/meta', { action: 'WriteMeta' }, MetaHandler.aImportMeta)
    rrr.del('/meta/:type/:name', { action: 'WriteMeta' },
        MetaHandler.aRemoveMeta)

    rrr.get('/meta/actions', { action: 'WriteMeta' }, MetaHandler.aGetActions)

    // ======================================
    // 用户
    // ======================================

    let UserHandler = require('../handler/UserHandler')

    rrr.get('/ping', { auth: true }, UserHandler.aPing)
    rrr.post('/sign-in', {}, UserHandler.aSignIn)
    rrr.post('/sign-out', { auth: true }, UserHandler.aSignOut)
    rrr.post('/change-password', { auth: true },
        UserHandler.aChangePassword)
    // rrr.post('/reset-password', {}, UserHandler.aResetPassword)
    // rrr.post('/change-phone', {action: 'ChangePhone'},
    //     UserHandler.aChangePhone)
    // rrr.post('/change-email', {action: 'ChangeEmail'},
    //     UserHandler.aChangeEmail)

    if (Config.ssoServer) {
        let SsoServerHandler = require('../handler/SsoServerHandler')

        rrr.get('/sso/auth', {}, SsoServerHandler.aAuth)
        rrr.post('/sso/sign-in', {}, SsoServerHandler.aSignIn)
        rrr.post('/sso/validate-token', {}, SsoServerHandler.aValidateToken)
        rrr.get('/sso/sign-out', {}, SsoServerHandler.aSignOut)

        let SsoClientHandler = require('../handler/SsoClientHandler')
        rrr.get('/sso/client/token', {}, SsoClientHandler.aAcceptToken)
        rrr.get('/sso/client/sign-out', {}, SsoClientHandler.aSignOut)
    }

    // ======================================
    // 安全
    // ======================================
    // let SecurityCodeHandler = require('../handler/SecurityCodeHandler')

    // 发送注册验证码到手机和邮箱
    // rrr.post('/security-code/phone/:phone', {},
    //     SecurityCodeHandler.aSendSignUpCodeToPhone)
    // rrr.post('/security-code/email/:email', {},
    //     SecurityCodeHandler.aSendSignUpCodeToEmail)

    // let CaptchaHandler = require('../handler/CaptchaHandler')
    // 请求一个图形验证码
    // rrr.get('/captcha', {}, CaptchaHandler.aGenerate)

    // ======================================
    // 实体 CRUD
    // ======================================

    let EntityHandler = require('../handler/EntityHandler')

    rrr.get('/entity/:entityName', { auth: 'listEntity' }, EntityHandler.aList)
    rrr.get('/entity/:entityName/:id', { auth: 'getEntity' },
        EntityHandler.aFindOneById)
    rrr.post('/entity/:entityName', { auth: 'createEntity' },
        EntityHandler.aCreateEntity)
    rrr.post('/entity/:entityName/batch', { auth: 'createEntity' },
        EntityHandler.aCreateEntitiesInBatch)
    rrr.put('/entity/:entityName/:id', { auth: 'updateOneEntity' },
        EntityHandler.aUpdateEntityById)
    rrr.put('/entity/:entityName', { auth: 'updateManyEntity' },
        EntityHandler.aUpdateEntityInBatch)
    rrr.del('/entity/:entityName', { auth: 'removeEntity' },
        EntityHandler.aDeleteEntityInBatch)
    rrr.post('/entity/:entityName/recover', { auth: 'recoverEntity' },
        EntityHandler.aRecoverInBatch)

    rrr.put('/entity/filters', { action: 'PreFilters' },
        EntityHandler.aSaveFilters)
    rrr.del('/entity/filters', { action: 'PreFilters' },
        EntityHandler.aRemoveFilters)

    rrr.get('/cache/memory', { action: 'ViewCache' },
        EntityHandler.aViewMemoryCache)

    rrr.del('/cache', { action: 'ClearEntityCache' },
        EntityHandler.aClearAllCache)

    // ======================================
    // 文件
    // ======================================

    let UploadHandler = require('../handler/UploadHandler')
    rrr.post('/file', { action: 'Upload' },
        UploadHandler.aUpload) // h5
    rrr.post('/file2', { action: 'Upload' },
        UploadHandler.aUpload2) // transport
    rrr.post('/rich-text-file', { action: 'RichTextUpload' },
        UploadHandler.aUploadForRichText)

    // ======================================
    // 搜索引擎
    // ======================================
    //
    // let ESController = require('../handler/ElasticSearchController')
    // rrr.post('/config-es', {action: 'ES'}, ESController.aConfig)
}
