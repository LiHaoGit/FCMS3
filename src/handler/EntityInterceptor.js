const _ = require("lodash")

exports.Actions = {
    Create: "Create",
    Update: "Update",
    Remove: "Remove",
    Get: "Get",
    List: "List"
}

async function defaultAsyncInterceptor(...args) {
    return args[args.length - 1]()
}

const asyncInterceptors = {}

exports.setInterceptor = function(entityName, actions, asyncInterceptor) {
    if (!_.isArray(actions)) actions = [actions]

    asyncInterceptors[entityName] = asyncInterceptors[entityName] || {}
    for (let action of actions)
        asyncInterceptors[entityName][action] = asyncInterceptor
}

exports.getInterceptor = function(entityName, action) {
    let asyncInterceptorOfEntity = asyncInterceptors[entityName]
    return asyncInterceptorOfEntity && asyncInterceptorOfEntity[action] ||
        defaultAsyncInterceptor
}
