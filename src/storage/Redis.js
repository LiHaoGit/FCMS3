const redis = require("redis")
const bluebird = require("bluebird")

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

const Log = require("../Log")

const subscribers = {}

let subscriberClient = null

exports.aInit = async function() {
    "use strict"
    const client = redis.createClient() // TODO redis config
    exports.client = client

    client.on("error", error => Log.system.error(error, "init redis"))
    client.on("ready", () => Log.system.info("Redis ready"))
    client.on("connect", () => Log.system.info("Redis connect"))

    subscriberClient = redis.createClient()
    subscriberClient.on("subscribe", () => Log.system.info("Redis subscribe"))

    subscriberClient.on("message", (channel, message) => {
        Log.system.info("ON REDIS MESSAGE", channel, message)
        let asyncHandlers = subscribers[channel]
        if (asyncHandlers)
            for (let asyncHandler of asyncHandlers)
                asyncHandler(message).catch(e =>
                    Log.system.error(e, "handle message"))
    })

    await subscriberClient.subscribeAsync("test", "MetaChange")

    await exports.aPublish("test", "hello")
}

exports.aDispose = async function() {
    "use strict"
    if (exports.client) exports.client.quit()
    if (subscriberClient) await subscriberClient.unsubscribeAsync("MetaChange")
    subscriberClient.quit()
}

exports.subscribe = function(channel, asyncHandler) {
    subscribers[channel] = subscribers[channel] || []
    subscribers[channel].push(asyncHandler)
}

exports.aPublish = async function(channel, message) {
    if (exports.client) await exports.client.publishAsync(channel, message)
}
