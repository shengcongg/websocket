export default {
    createNew: () => {
        let clientManager = {
            ws: null,
            wsUrl: null,
        };

        let reconnectFlag = true
        let reconnectLock = false
        let reconnectCount = 0;
        let consumersArray = [];

        manager.createConnection = wsUrl => {
            return new Promise(async (resolve, reject) => {
                manager.wsUrl = wsUrl;
                let ws;
                try {
                    ws = clientManager.ws = await connect(wsUrl);
                    console.info("[WebSocket] Connection created: " + wsUrl + ".");
                    resolve(ws);
                } catch (err) {
                    reject(err)
                }
            });
        };

        let connect = () => {
            return new Promise(async (resolve, reject) => {
                let ws;
                try {
                    ws = await new WebSocket(manager.wsUrl);
                } catch (err) {
                    return Promise.reject(new Error(err));
                }
                ws.onopen = () => {
                    ws.onclose = oncloseHandler;
                    ws.onmessage = onmessageHandler;
                    resolve(ws);
                };
                ws.onerror = async errEvt => {
                    reconnectLock = false
                    console.error(errEvt)
                    if (reconnectCount >= 5) {
                        console.info("[WebSocket] Reconnection failed too many times.");
                        reject("[WebSocket] Reconnection failed too many times.");
                    } else {
                        reconnect().then(
                            ws => {
                                resolve(ws);
                            },
                            err => {
                                reject(err);
                            }
                        );
                    }
                };
            });
        };

        let reconnect = () => {
            reconnectCount++;
            return new Promise((resolve, reject) => {
                if (reconnectLock) reject("reconnection locked");
                if (reconnectFlag) {
                    reconnectLock = true;
                    setTimeout(async () => {
                        try {
                            let ws = await connect();
                            console.info("[WebSocket] Reconnection successful.")
                            resolve(ws);
                        } catch (err) {
                            reject(err);
                        }
                    }, 5000);
                } else {
                    reject("reconnect not allowed");
                }
            });
        };

        manager.disconnect = () => {
            let ws = clientManager.ws;
            reconnectFlag = false;
            if (ws) {
                ws.close();
                console.info("[WebSocket] Connection closed: " + manager.wsUrl + ".")
            }
        };

        onmessageHandler = msgEvt => {
            let response = JSON.parse(msgEvt.data);
            for (
                let index = 0;
                index < consumersArray.length;
                index++
            ) {
                consumersArray[index](response);
            }
        };

        oncloseHandler = closeEvt => {
            console.info(closeEvt);
            if (reconnectFlag) {
                reconnect();
            }
        };

        manager.send = contentAnyType => {
            if (clientManager.ws) {
                clientManager.ws.send(contentAnyType);
            }
        };

        manager.addMessageConsumer = consumer => {
            consumersArray.push(consumer);
            console.info("consumer added", consumersArray.length)
        };

        manager.removeMessageConsumer = consumer => {
            for (
                let index = 0;
                index < consumersArray.length;
                index++
            ) {
                if (consumer === consumersArray[index]) {
                    let index = consumersArray.indexOf(consumer)
                    if (index > -1) {
                        consumersArray.splice(index, 1);
                        console.info("consumer removed", consumersArray.length)
                    }
                }
            }
        };
        manager.clearMessageConsumer = () => {
            consumersArray = [];
            console.info("consumer cleared", consumersArray.length)
        };

        return manager;
    }
};
