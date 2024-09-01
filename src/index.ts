import {dirname, join } from "path";
import { fileURLToPath } from "url";

import { BoreClient } from "./bore/bore"

import express from "express";

async function main(): Promise<void> {
    global.__filename = fileURLToPath(import.meta.url);
    global.__dirname = dirname(__filename);

    const binary = join(__dirname, "bore", "bin", "bore.exe")
    const client = new BoreClient(binary)

    const server = express()

    server.use(express.urlencoded({ extended: true }))
    server.use(express.json())

    server.get('/api/list', async (req, res, next) => {
        const tunnels = client.list()

        res.send(tunnels)
    })
    
    server.post('/api/tunnel', async (req, res, next) => {
        const body = req.body

        const port = body.port
        if (!port) return res.status(400).send({ error: "Missing internal port" })
        
        const url = await client.tunnel(port)
            .catch(() => {
                return res.status(500).send({ error: "Could not tunnel" })
            })

        res.send({ url })
    })

    server.post('/api/close', async (req, res, next) => {
        const body = req.body

        const port = body.port
        if (!port) return res.status(400).send({ error: "Missing internal port" })

        const success = await client.close(port)

        res.send({ success })
    })

    server.listen(6969)
}

main();