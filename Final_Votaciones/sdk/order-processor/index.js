import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr"
import express from 'express'
const app = express()
const apiPort = 3000

// const STATE_STORES = {
//     APPSTATE: "appstate",
//     USERS: "users",
//     CANDIDATES: "candidates"
// }
const DAPR_STATE_STORE_NAME = "statestore"

const protocol = (process.env.DAPR_PROTOCOL === "grpc") ? CommunicationProtocolEnum.GRPC : CommunicationProtocolEnum.HTTP
const host = process.env.DAPR_HOST ?? "localhost"

let port
switch (protocol) {
    case CommunicationProtocolEnum.HTTP: {
        port = process.env.DAPR_HTTP_PORT
        break
    }
    case CommunicationProtocolEnum.GRPC: {
        port = process.env.DAPR_GRPC_PORT
        break
    }
    default: {
        port = 3500
    }
}

// const APPSTATE = {
//     InputCandidates: true/false,
//     Voting: true/false
// }

// const USERS = {
//     username,
//     password,
//     isAdmin
// }

// const CANDIDATE = {
//     name,
//     position,
//     party,
//     votes: list[ids of users]
// }

const client = new DaprClient(host, port, protocol)

app.get('/startCandidateAdding', async (req, res) => {

    await client.state.save(DAPR_STATE_STORE_NAME, [{ key: 'appstate', value: '1' }])
    console.log("Phase 1")
    res.send('Phase 1 initiated')
})

app.get('/finishCandidateAdding', async (req, res) => {

    await client.state.save(DAPR_STATE_STORE_NAME, [{ key: 'appstate', value: '2' }])
    console.log("Phase 2")
    res.send('Phase 2 initiated')
})

app.get('/getPhase', async (req, res) => {
    const savedPhase = await client.state.get(DAPR_STATE_STORE_NAME, 'appstate')
    console.log("Current app state: ", savedPhase)
    res.send(`Current app state: ${savedPhase}`)
})



// async function main() {
//     const client = new DaprClient(host, port, protocol)

//     // For each loop, Save order, Get order, and Delete order
//     for (let i = 1; i <= 100; i++) {
//         const order = { orderId: i.toString() }
//         const state = [
//             {
//                 key: order.orderId,
//                 value: order
//             }
//         ]

//         // Save state into a state store
//         await client.state.save(DAPR_STATE_STORE_NAME, state)
//         console.log("Saving Order: ", order)

//         // Get state from a state store
//         const savedOrder = await client.state.get(DAPR_STATE_STORE_NAME, order.orderId)
//         console.log("Getting Order: ", savedOrder)

//         // Delete state from the state store
//         await client.state.delete(DAPR_STATE_STORE_NAME, order.orderId)
//         console.log("Deleting Order: ", order)

//         await sleep(500)
//     }
// }

app.listen(apiPort, () => {
    console.log(`App on port ${apiPort}`);
})