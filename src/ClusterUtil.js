const Config = require("./Config")

exports.use = function(f) {
    if (!Config.cluster)
        f()
    else {
        let cluster = require("cluster")
        let workerNum = Config.workerNum

        if (cluster.isMaster) {
            console.log(`Master ${process.pid} is running`)

            cluster.on("exit", worker => {
                console.log(`worker ${worker.process.pid} died`)
            })

            for (let i = 0; i < workerNum; i++) {
                cluster.fork()
            }
        } else {
            console.log(`Start Worker ${process.pid} started`)
            f()
        }
    }
}
