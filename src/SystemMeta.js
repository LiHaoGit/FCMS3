const _ = require("lodash")

// const Log = require('./Log')
const Meta = require("./Meta")
const Config = require("./Config")

function patchSystemFields(entityMeta) {
    let fields = {}
    let dbType = entityMeta.db
    let idType = entityMeta.idType || (dbType === Meta.DB.mongo ?
        "ObjectId" : "String")
    let idPersistType = dbType === Meta.DB.mongo ? idType === "ObjectId" ?
        "ObjectId" : "String" : "char"
    let intPersistType = dbType === Meta.DB.mongo && "Number" || "int"
    let timestampPersistType = dbType === Meta.DB.mongo && "Date" || "timestamp"
    let userIdPersistType = dbType === Meta.DB.mongo && "String" || "char"

    fields._id = {
        system: true, name: "_id", label: "ID", type: idType,
        required: true,
        persistType: idPersistType, sqlColM: Meta.ObjectIdStringLength,
        inputType: "Text", noCreate: true, noEdit: true, fastFilter: true
    }
    fields._version = {
        system: true, name: "_version", label: "修改版本", type: "Int",
        persistType: intPersistType, sqlColM: 12,
        inputType: "Int", noCreate: true, noEdit: true, hideInListPage: true
    }
    fields._createdOn = {
        system: true, name: "_createdOn", label: "创建时间", type: "DateTime",
        persistType: timestampPersistType,
        inputType: "DateTime", noCreate: true, noEdit: true,
        hideInListPage: true
    }
    fields._modifiedOn = {
        system: true, name: "_modifiedOn", label: "修改时间", type: "DateTime",
        persistType: timestampPersistType,
        inputType: "DateTime", noCreate: true, noEdit: true
    }
    fields._createdBy = {
        system: true, name: "_createdBy", label: "创建人", type: "Reference",
        refEntity: "F_User",
        persistType: userIdPersistType, sqlColM: Meta.ObjectIdStringLength,
        inputType: "Reference", noCreate: true, noEdit: true,
        hideInListPage: true
    }
    fields._modifiedBy = {
        system: true, name: "_modifiedBy", label: "修改人", type: "Reference",
        refEntity: "F_User",
        persistType: userIdPersistType, sqlColM: Meta.ObjectIdStringLength,
        inputType: "Reference", noCreate: true, noEdit: true,
        hideInListPage: true
    }

    return entityMeta.fields = Object.assign(entityMeta.fields, fields)
}

exports.patchSystemFields = patchSystemFields

function arrayToOption(a) {
    return _.map(a, item => ({name: item, label: item}))
}

const SystemEntities = {
    F_EntityMeta: {
        system: true,
        name: "F_EntityMeta",
        label: "实体元数据",
        db: Meta.DB.none,
        fields: {
            system: {
                name: "system",
                label: "系统实体",
                type: "Boolean",
                inputType: "Check",
                noCreate: true,
                noEdit: true
            },
            name: {
                name: "name", label: "名称", type: "String",
                inputType: "Text"
            },
            label: {
                name: "label", label: "显示名", type: "String",
                inputType: "Text"
            },
            db: {
                name: "db",
                label: "数据库类型",
                type: "String",
                inputType: "Select",
                options: [{name: Meta.DB.mongo, label: "MongoDB"},
                    {name: Meta.DB.mysql, label: "MySQL"},
                    {name: Meta.DB.none, label: "不使用数据库"}]
            },
            dbName: {
                name: "dbName",
                label: "数据库名",
                type: "String",
                inputType: "Select"
            },
            tableName: {
                name: "tableName",
                label: "表名",
                type: "String",
                inputType: "Text"
            },
            noCreate: {
                name: "noCreate",
                label:
                "禁止新增",
                type: "Boolean",
                inputType: "Check"
            },
            noEdit: {
                name: "noEdit",
                label:
                "禁止编辑",
                type: "Boolean",
                inputType: "Check"
            },
            noDelete: {
                name: "noDelete",
                label:
                "禁止删除",
                type: "Boolean",
                inputType: "Check"
            },
            singleton: {
                name: "singleton",
                label:
                "单例",
                type: "Boolean",
                inputType: "Check"
            },
            digestFields: {
                name: "digestFields",
                label:
                "摘要字段",
                type: "String",
                inputType: "Text"
            },
            mongoIndexes: {
                name: "mongoIndexes",
                label: "MongoDB索引",
                type: "Component",
                refEntity: "F_MongoIndex",
                multiple: true,
                inputType: "PopupComponent"
            },
            mysqlIndexes: {
                name: "mysqlIndexes",
                label: "MySQL索引",
                type: "Component",
                refEntity: "F_MySQLIndex",
                multiple: true,
                inputType: "PopupComponent",
            },
            editEnhanceFunc: {
                name: "editEnhanceFunc",
                label: "编辑增强脚本",
                type: "String",
                inputType: "Text",
                hideInListPage: true
            },
            viewEnhanceFunc: {
                name: "viewEnhanceFunc",
                label: "详情增强脚本",
                type: "String",
                inputType: "Text",
                hideInListPage: true
            },
            fieldGroups: {
                name: "fieldGroups", label: "字段分组", type: "Component",
                refEntity: "F_KeyValue", inputType: "PopupComponent",
                multiple: true
            },
            fields: {
                name: "fields",
                label: "字段列表",
                type: "Component",
                refEntity: "F_FieldMeta",
                multiple: true,
                inputType: "PopupComponent"
            }
        }
    },
    F_FieldMeta: {
        system: true,
        noPatchSystemFields: true,
        name: "F_FieldMeta",
        label: "字段元数据",
        db: Meta.DB.none,
        digestFields: "name,label,type,multiple",
        editEnhanceFunc: "F.enhanceFieldMetaEdit",
        fields: {
            system: {
                name: "system", label: "系统字段", type: "Boolean",
                inputType: "Check",
                noCreate: true, noEdit: true, hideInListPage: true
            },
            name: {
                name: "name", label: "字段名", type: "String",
                inputType: "Text"
            },
            label: {
                name: "label", label: "显示名", type: "String",
                inputType: "Text"
            },
            group: {
                name: "group", label: "分组键", type: "String",
                inputType: "Text"
            },
            comment: {
                name: "comment", label: "开发备注", type: "String",
                inputType: "TextArea", hideInListPage: true
            },
            useGuide: {
                name: "useGuide", label: "使用备注", type: "String",
                inputType: "Text", hideInListPage: true
            },
            type: {
                name: "type", label: "类型", type: "String",
                inputType: "Select",
                options: arrayToOption(Meta.FieldDataTypes)
            },
            unique: {
                name: "unique", label: "值唯一", type: "Boolean",
                inputType: "Check", hideInListPage: true
            },
            refEntity: {
                name: "refEntity", label: "关联实体", type: "String",
                inputType: "Text"
            },
            inputType: {
                name: "inputType", label: "输入类型", type: "String",
                inputType: "Select",
                optionsDependOnField: "type",
                optionsFunc: "F.optionsOfInputType",
                hideInListPage: true
            },
            inputFunc: {
                name: "inputFunc", label: "输入构建器", type: "String",
                inputType: "Text", hideInListPage: true
            },
            inputRequired: {
                name: "inputRequired",
                label: "输入值不能为空",
                type: "Boolean",
                inputType: "Check",
                hideInListPage: true
            },
            notShow: {
                name: "notShow",
                label: "界面隐藏",
                type:
                "Boolean",
                inputType: "Check",
                hideInListPage: true
            },
            noCreate: {
                name: "noCreate",
                label: "不允许创建",
                type: "Boolean",
                inputType: "Check",
                hideInListPage: true
            },
            noEdit: {
                name: "noEdit",
                label: "不允许编辑",
                type: "Boolean",
                inputType: "Check",
                hideInListPage: true
            },
            hideInListPage: {
                name: "hideInListPage",
                label: "列表页面不显示",
                type: "Boolean",
                inputType: "Check",
                hideInListPage: true
            },
            fastSearch: {
                name: "fastSearch",
                label: "支持快速搜索",
                type: "Boolean",
                inputType: "Check"
            },
            persistType: {
                name: "persistType",
                label: "存储类型",
                type: "String",
                inputType: "Select",
                optionsDependOnField: "type",
                optionsFunc: "F.optionsOfPersistType",
                hideInListPage: true
            },
            sqlColM: {
                name: "sqlColM",
                label: "SQL列宽",
                type: "Int",
                inputType: "Int",
                hideInListPage: true
            },
            required: {
                name: "required",
                label: "存储非空",
                type: "Boolean",
                inputType: "Check",
                hideInListPage: true
            },
            multiple: {
                name: "multiple",
                label: "多个值",
                type: "Boolean",
                inputType: "Check"
            },
            multipleUnique: {
                name: "unique",
                label: "多个值不重复",
                type: "Boolean",
                inputType: "Check",
                hideInListPage: true
            },
            multipleMin: {
                name: "multipleMin",
                label: "多个值数量下限",
                type: "Int",
                inputType: "Int",
                hideInListPage: true
            },
            multipleMax: {
                name: "multipleMax",
                label: "多个值数量上限",
                type: "Int",
                inputType: "Int",
                hideInListPage: true
            },
            options: {
                name: "options",
                label: "输入选项",
                type: "Component",
                refEntity: "F_FieldInputOption",
                multiple: true,
                inputType: "InlineComponent",
                hideInListPage: true
            },
            optionsDependOnField: {
                name: "optionsDependOnField",
                label: "输入选项随此字段改变",
                type: "String",
                inputType: "Text",
                hideInListPage: true
            },
            optionsFunc: {
                name: "optionsFunc",
                label: "选项决定函数",
                type: "String",
                inputType: "Text",
                hideInListPage: true
            },
            groupedOptions: {
                name: "groupedOptions",
                label: "分组的输入选项",
                type: "Component",
                refEntity: "F_FieldInputGroupedOptions",
                multiple: true,
                inputType: "InlineComponent",
                hideInListPage: true
            },
            optionWidth: {
                name: "optionWidth",
                label: "选项宽度",
                type: "Int",
                inputType: "Int",
                hideInListPage: true
            },
            fileStoreDir: {
                name: "fileStoreDir",
                label: "文件存储路径",
                type: "String",
                inputType: "Text",
                hideInListPage: true
            },
            removePreviousFile: {
                name: "removePreviousFile",
                label: "自动删除之前的文件",
                type: "Boolean",
                inputType: "Check",
                hideInListPage: true
            },
            fileMaxSize: {
                name: "fileMaxSize",
                label: "文件大小限制（字节）",
                type: "Int",
                inputType: "Int",
                hideInListPage: true
            }
        }
    },
    F_FieldInputOption: {
        system: true,
        noPatchSystemFields: true,
        name: "F_FieldInputOption",
        label: "字段输入选项",
        db: Meta.DB.none,
        digestFields: "name,label",
        fields: {
            name: {
                name: "name", label: "字段名", type: "String",
                inputType: "Text"
            },
            label: {
                name: "label", label: "显示名", type: "String",
                inputType: "Text"
            }
        }
    },
    F_FieldInputGroupedOptions: {
        system: true,
        noPatchSystemFields: true,
        name: "F_FieldInputGroupedOptions",
        label: "字段输入分组选项",
        db: Meta.DB.none,
        digestFields: "key",
        fields: {
            key: {
                name: "key", label: "分组键", type: "String",
                inputType: "Text"
            },
            options: {
                name: "options",
                label: "选项列表",
                type: "Component",
                refEntity: "F_FieldInputOption",
                multiple: true,
                inputType: "InlineComponent"
            }
        }
    },
    F_MongoIndex: {
        system: true,
        noPatchSystemFields: true,
        name: "F_MongoIndex",
        label: "MongoDB索引",
        db: Meta.DB.none,
        digestFields: "name,fields",
        fields: {
            name: {
                name: "name", label: "索引名", type: "String",
                inputType: "Text"
            },
            fields: {
                name: "fields",
                label: "字段",
                type: "String",
                inputType: "TextArea",
                comment: "格式：name:-1,_createdOn:-1"
            },
            unique: {
                name: "unique",
                label: "unique",
                type: "Boolean",
                inputType: "Check"
            },
            sparse: {
                name: "sparse",
                label: "sparse",
                type: "Boolean",
                inputType: "Check"
            },
            errorMessage: {
                name: "errorMessage",
                label: "错误消息",
                type: "String",
                inputType: "Text"
            }
        }
    },
    F_MySQLIndex: {
        system: true,
        noPatchSystemFields: true,
        name: "F_MySQLIndex",
        label: "MySQL索引",
        db: Meta.DB.none,
        digestFields: "name,fields",
        fields: {
            name: {
                name: "name", label: "索引名", type: "String",
                inputType: "Text"
            },
            fields: {
                name: "fields",
                label: "字段",
                type: "String",
                inputType: "TextArea",
                comment: "格式：name:-1,_createdOn:-1"
            },
            unique: {
                name: "unique",
                label: "unique",
                type: "Boolean",
                inputType: "Check"
            },
            indexType: {
                name: "indexType",
                label: "indexType",
                type: "String",
                inputType: "CheckList",
                options:
                [{name: "BTREE", label: "BTREE"},
                    {name: "HASH", label: "HASH"},
                    {name: "RTREE", label: "RTREE"}]
            },
            errorMessage: {
                name: "errorMessage",
                label: "错误消息",
                type: "String",
                inputType: "Text"
            }
        }
    },
    F_SystemConfig: {
        system: true,
        name: "F_SystemConfig",
        label: "系统配置",
        db: Meta.DB.mongo,
        dbName: "main",
        tableName: "F_SystemConfig",
        fields: {
            key: {
                name: "key",
                label: "KEY",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            mail: {
                name: "systemMail",
                label: "发信邮箱",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            mailPassword: {
                name: "mailPassword",
                label: "发信密码",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            mailHost: {
                name: "mailHost",
                label: "发信HOST",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            mailPort: {
                name: "mailPort",
                label: "发信PORT",
                type: "String",
                inputType: "Text",
                persistType: "String"
            }
        }
    },
    F_Menu: {
        system: true,
        name: "F_Menu",
        label: "菜单",
        db: Meta.DB.mongo,
        dbName: "main",
        tableName: "F_Menu",
        fields: {
            menuGroups: {
                name: "menuGroups",
                label: "菜单组",
                type: "Component",
                refEntity: "F_MenuGroup",
                inputType: "InlineComponent",
                multiple: true
            }
        }
    },
    F_MenuGroup: {
        system: true,
        name: "F_MenuGroup",
        label: "菜单组",
        db: Meta.DB.none,
        fields: {
            label: {
                name: "label", label: "显示名", type: "String",
                inputType: "Text"
            },
            menuItems: {
                name: "menuItems",
                label: "菜单项",
                type: "Component",
                refEntity: "F_MenuItem",
                inputType: "PopupComponent",
                multiple: true
            }
        }
    },
    F_MenuItem: {
        system: true,
        name: "F_MenuItem",
        label: "菜单项",
        db: Meta.DB.none,
        digestFields: "label,toEntity,callFunc",
        fields: {
            label: {
                name: "label",
                label: "显示名",
                type: "String",
                inputType: "Text"
            },
            toEntity: {
                name: "toEntity",
                label: "到实体",
                type: "String",
                inputType: "Text"
            },
            callFunc: {
                name: "callFunc",
                label: "调用函数名",
                type: "String",
                inputType: "Text"
            }
        }
    },
    F_User: {
        system: true,
        idType: "String",
        name: "F_User",
        label: "用户",
        db: Meta.DB.mongo,
        dbName: "main",
        tableName: "F_User",
        mongoIndexes: [{
            name: "username",
            fields: "username:1",
            unique: true,
            sparse: true,
            errorMessage: "用户名重复"
        },
        {
            name: "phone",
            fields: "phone:1",
            unique: true,
            sparse: true,
            errorMessage: "手机已被注册"
        },
        {
            name: "email",
            fields: "email:1",
            unique: true,
            sparse: true,
            errorMessage: "邮箱已被注册"
        },
        {
            name: "nickname",
            fields: "nickname:1",
            unique: true,
            sparse: true,
            errorMessage: "昵称已被注册"
        }],
        digestFields: "username|nickname|phone|email|_id",
        fields: {
            username: {
                name: "username",
                label: "用户名",
                asFastFilter: true,
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            nickname: {
                name: "nickname",
                label: "昵称",
                asFastFilter: true,
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            password: {
                name: "password",
                label: "密码",
                type: "Password",
                inputType: "Password",
                persistType: "String"
            },
            phone: {
                name: "phone",
                label: "手机",
                asFastFilter: true,
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            email: {
                name: "email",
                label: "邮箱",
                asFastFilter: true,
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            admin: {
                name: "admin",
                label: "超管",
                type: "Boolean",
                inputType: "Check",
                persistType: "Boolean"
            },
            disabled: {
                name: "disabled",
                label: "禁用",
                type: "Boolean",
                inputType: "Check",
                persistType: "Boolean"
            },
            roles: {
                name: "roles",
                label: "角色",
                type: "Reference",
                refEntity: "F_UserRole",
                multiple: true,
                inputType: "Reference",
                persistType: "String"
            },
            acl: {
                name: "acl",
                label: "ACL",
                type: "Object",
                multiple: false,
                inputFunc: "F.inputACL",
                persistType: "Document",
                hideInListPage: true
            }
        }
    },
    F_UserRole: {
        system: true,
        idType: "String",
        name: "F_UserRole",
        label: "用户角色",
        db: Meta.DB.mongo,
        dbName: "main",
        tableName: "F_UserRole",
        digestFields: "name",
        fields: {
            name: {
                name: "name",
                label: "角色名",
                type: "String",
                inputType: "Text",
                asFastFilter: true,
                persistType: "String"
            },
            acl: {
                name: "acl",
                label: "ACL",
                type: "Object",
                multiple: false,
                inputFunc: "F.inputACL",
                persistType: "Document",
                hideInListPage: true
            }
        }
    },
    F_UserSession: {
        system: true,
        name: "F_UserSession",
        label: "用户Session",
        db: Meta.DB.mongo,
        dbName: "main",
        tableName: "F_UserSession",
        fields: {
            userId: {
                name: "userId",
                label: "用户ID",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            userToken: {
                name: "userToken",
                label: "用户TOKEN",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            origin: {
                name: "origin",
                label: "origin",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            expireAt: {
                name: "expireAt",
                label: "过期时间",
                type: "Int",
                inputType: "Int",
                persistType: "Int"
            }
        }
    },
    F_ListFilters: {
        system: true,
        name: "F_ListFilters",
        label: "列表查询条件",
        db: Meta.DB.mongo,
        dbName: "main",
        tableName: "F_ListFilters",
        digestFields: "name,entityName",
        fields: {
            name: {
                name: "name",
                label: "名字",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            entityName: {
                name: "entityName",
                label: "实体名",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            criteria: {
                name: "criteria",
                label: "条件",
                type: "String",
                inputType: "TextArea",
                persistType: "String"
            },
            sortBy: {
                name: "sortBy",
                label: "排序字段",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            sortOrder: {
                name: "sortOrder",
                label: "顺序",
                type: "String",
                inputType: "Text",
                persistType: "String"
            }
        }
    },
    F_SsoSession: {
        system: true,
        name: "F_SsoSession",
        label: "SSoSession",
        db: Meta.DB.mongo,
        dbName: "main",
        tableName: "F_SsoSession",
        fields: {
            userId: {
                name: "userId",
                label: "用户ID",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            userToken: {
                name: "userToken",
                label: "用户TOKEN",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            expireAt: {
                name: "expireAt",
                label: "过期时间",
                type: "Int",
                inputType: "Int",
                persistType: "Int"
            }
        }
    },
    F_SsoClientToken: {
        system: true,
        name: "F_SsoClientToken",
        label: "SSO客户端授权",
        db: Meta.DB.mongo,
        dbName: "main",
        tableName: "F_SsoClientToken",
        digestFields: "",
        fields: {
            origin: {
                name: "origin",
                label: "客户端域",
                type: "String",
                inputType: "Text",
                persistType: "String"
            },
            entityName: {
                name: "token",
                label: "授权令牌",
                type: "String",
                inputType: "Text",
                persistType: "String"
            }
        }
    },
    F_KeyValue: {
        system: true, name: "F_KeyValue", label: "键值对",
        db: Meta.DB.mongo, dbName: "main", tableName: "F_KeyValue",
        digestFields: "key",
        fields: {
            key: {
                name: "key", label: "键", type: "String", inputType: "Text",
                persistType: "String"
            },
            value: {
                name: "value", label: "值", type: "String", inputType: "Text",
                persistType: "String"
            }
        }
    }
}

exports.init = function(extraEntities) {
    if (extraEntities) mergeEntities(extraEntities)

    for (let entityName in SystemEntities) {
        let entityMeta = SystemEntities[entityName]
        if (!entityMeta.noPatchSystemFields) patchSystemFields(entityMeta)
        delete entityMeta.idType
        entityMeta.system = true
    }

    let databases = _.map(Config.mongoDatabases, d => d.name)
    SystemEntities.F_EntityMeta.fields.dbName.options = arrayToOption(databases)

    // TODO mysql databases

    exports.SystemEntities = SystemEntities
}

function mergeEntities(extraEntities) {
    // Log.debug("extraEntities", extraEntities)
    for (let entityName in extraEntities) {
        let extraEntity = extraEntities[entityName]
        let systemEntity = SystemEntities[entityName]
        if (systemEntity) {
            for (let itemName in extraEntity) {
                let itemValue = extraEntity[itemName]
                if (itemName === "fields") {
                    let systemFields = systemEntity.fields
                    for (let fieldName in itemValue) {
                        let extraFieldMeta = itemValue[fieldName]
                        let systemFieldMeta = systemFields[fieldName]
                        if (systemFieldMeta) {
                            Object.assign(systemFieldMeta, extraFieldMeta)
                        } else {
                            // Log.debug('add field', extraFieldMeta)
                            systemFields[fieldName] = extraFieldMeta
                        }
                    }
                } else if (itemName === "mongoIndexes") {
                    // 索引采用追加的方式
                    systemEntity.mongoIndexes = systemEntity.mongoIndexes || []
                    systemEntity.mongoIndexes.splice(0, 0, ...itemValue)
                } else {
                    systemEntity[itemName] = itemValue
                }
            }
        } else {
            SystemEntities[entityName] = extraEntity
        }
    }
}
