const Config = require("../Config")

if (Config.cluster)
    module.exports = require("./RedisCache")
else
    module.exports = require("./MemoryCache")
