import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr"
import express from 'express'
import bodyParser from 'body-parser'
const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

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
//     party
// }

// const VOTE = {
//     dpi,
//     candidate_no,
//     date,
//     origin_ip
// }

const client = new DaprClient(host, port, protocol)

const getStorage = async (key) => await client.state.get(DAPR_STATE_STORE_NAME, key)
const saveStorage = async (data) => await client.state.save(DAPR_STATE_STORE_NAME, data)

app.get('/startCandidateAdding', async (req, res) => {
    await saveStorage([{ key: 'appstate', value: 1 }])
    res.send('Phase 1 initiated')
})

app.get('/finishCandidateAdding', async (req, res) => {
    await saveStorage([{ key: 'appstate', value: 2 }])
    res.send('Phase 2 initiated')
})

app.get('/getPhase', async (req, res) => {
    const savedPhase = await getStorage('appstate')
    res.send(`Current app state: ${savedPhase}`)
})

app.get('/cleanCandidates', async (req, res) => {
    await saveStorage([{ key: 'candidates', value: null }])
    return res.send('Candidates cleared')
})

app.get('/getCandidates', async (req, res) => {
    let currentCandidates = await getStorage('candidates')
    if (!currentCandidates) return res.send('Sin candidatos')

    res.send(currentCandidates[0].value)
})

app.post('/addCandidate', async (req, res) => {
    let currentAppState = await getStorage('appstate')
    if (currentAppState !== 1) return res.sendStatus(400)

    const newCandidate = req.body
    if (!newCandidate.Name || !newCandidate.Party) return res.sendStatus(400)

    let currentCandidates = await getStorage('candidates')
    if (currentCandidates) {
        newCandidate.id = currentCandidates[0].value.length + 1
        currentCandidates[0].value = [...currentCandidates[0].value, newCandidate]

        await saveStorage([{ key: 'candidates', value: currentCandidates }])
        return res.send({ response: `Candidate added`, newCandidate })
    }

    newCandidate.id = 1

    currentCandidates = [
        {
            key: 'candidates',
            value: [
                newCandidate
            ]
        }
    ]
    await saveStorage([{ key: 'candidates', value: currentCandidates }])
    return res.send({ response: `Candidate added`, newCandidate })
})

app.get('/startVoting', async (req, res) => {
    await saveStorage([{ key: 'appstate', value: 3 }])
    res.send('Phase 3 initiated')
})

app.get('/finishVoting', async (req, res) => {
    await saveStorage([{ key: 'appstate', value: 4 }])
    res.send('Phase 4 initiated')
})

app.get('/cleanVotes', async (req, res) => {
    await saveStorage([{ key: 'votes', value: null }])
    return res.send('Votes cleared')
})

app.get('/getVotes', async (req, res) => {
    let currentVotes = await getStorage('votes')
    if (!currentVotes) return res.send('Sin votos')

    res.send(currentVotes[0].value)
})

app.get('/cleanFrauds', async (req, res) => {
    await saveStorage([{ key: 'frauds', value: null }])
    return res.send('Frauds cleared')
})

app.get('/getFrauds', async (req, res) => {
    let currentFrauds = await getStorage('frauds')
    if (!currentFrauds) return res.send('Sin fraudes')

    res.send(currentFrauds[0].value)
})

app.post('/vote', async (req, res) => {
    let currentAppState = await getStorage('appstate')
    if (currentAppState !== 3) return res.sendStatus(400)

    const newVote = req.body
    if (!newVote.DPI || !newVote.CandidateNumber || !newVote.OriginIP) return res.sendStatus(400)

    let currentVotes = await getStorage('votes')
    if (currentVotes) {
        let currentCandidates = await getStorage('candidates')
        if (!currentCandidates[0].value.some(c => c.id === newVote.CandidateNumber)) newVote.CandidateNumber = 0

        if (!currentVotes[0].value.some(v => v.DPI === newVote.DPI)) {
            newVote.id = currentVotes[0].value.length + 1
            currentVotes[0].value = [...currentVotes[0].value, newVote]

            await saveStorage([{ key: 'votes', value: currentVotes }])
            return res.send({ response: `Vote added`, newVote })
        }


        let currentFrauds = await getStorage('frauds')
        if (currentFrauds) {
            newVote.id = currentFrauds[0].value.length + 1
            currentFrauds[0].value = [...currentFrauds[0].value, newVote]

            await saveStorage([{ key: 'frauds', value: currentFrauds }])
            return res.send({ response: `Vote added`, newVote })
        }
        newVote.id = 1

        currentFrauds = [
            {
                key: 'frauds',
                value: [
                    newVote
                ]
            }
        ]
        await saveStorage([{ key: 'frauds', value: currentFrauds }])
        return res.send({ response: `Vote added`, newVote })
    }

    newVote.id = 1

    currentVotes = [
        {
            key: 'votes',
            value: [
                newVote
            ]
        }
    ]
    await saveStorage([{ key: 'votes', value: currentVotes }])
    return res.send({ response: `Vote added`, newVote })
})

app.get('/statistics', async (req, res) => {
    let currentAppState = await getStorage('appstate')
    if (currentAppState !== 3 && currentAppState !== 4) return res.sendStatus(400)

    let statistics = {}

    let currentVotes = await getStorage('votes')

    if (!currentVotes) statistics.votes = 'Sin votos'
    else {
        let votes = {}
        let currentCandidates = await getStorage('candidates')
        currentVotes[0].value.forEach(v => {
            if (v.CandidateNumber === 0) {
                if (typeof votes.Nulo === 'undefined') votes.Nulo = 1
                else votes.Nulo += 1
            } else {
                let candidate = currentCandidates[0].value.filter(c => c.id === v.CandidateNumber)[0];
                if (typeof votes[candidate.Name] === 'undefined') votes[candidate.Name] = 1
                else votes[candidate.Name] += 1
            }
        })

        statistics.votes = votes
    }

    let currentFrauds = await getStorage('frauds')

    if (!currentFrauds) statistics.frauds = 'Sin fraudes'
    else statistics.frauds = currentFrauds[0].value.length

    res.send(statistics)
})

app.listen(apiPort, () => {
    console.log(`App on port ${apiPort}`);
})
