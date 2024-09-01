import { existsSync } from "fs"
import { ChildProcess, spawn } from "child_process"

export class BoreClient {
    bin_path: string;

    private portmap: Map<number, string> = new Map<number, string>();
    private tunnels: Map<string, ChildProcess> = new Map<string, ChildProcess>();

    constructor(bin_path: string) {
        if (!existsSync(bin_path)) throw new Error("Bore binary not found.")

        spawn(bin_path, ["-V"]).stdout.once("data", (chunk: Buffer) => {
            const output = chunk.toString().match(/bore-cli [\d+.]+/g)
            
            if (!output) throw new Error("Binary invalid")
            
            const version = output[0].split(" ")[1]
            console.log(`Running bore v${version}`)
        })

        this.bin_path = bin_path
    }

    list() {
        return Object.fromEntries(this.portmap)
    }

    tunnel(port: number, destination: string = "bore.pub") {
        return new Promise<string>(async (res, rej) => {
            const existing = this.portmap.get(port)
            if (existing) return res(existing)

            const proc = spawn(this.bin_path, [
                "local", 
                port.toString(), 
                "--to", destination
            ])
    
            proc.stdout.once('data', (chunk: Buffer) => {
                const output = chunk.toString()
                const filtered = output.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                const extport = filtered.match(/(?<=remote_port=)\d+/)?.[0]
                const url = `${destination}:${extport}`
    
                if (extport) {
                    this.portmap.set(port, url)
                    this.tunnels.set(url, proc)
                    console.log(`Tunneling port ${port} to ${url}`)

                    res(url)
                }
                else {
                    console.log(`Error attempting to tunnel port ${port}`)

                    rej("Could not tunnel")
                }
            })
        })
    }

    close(port: number) {
        const url = this.portmap.get(port)
        if (!url) return false

        const proc = this.tunnels.get(url)
        if (!proc) return false

        console.log(`Attempting to close ${url}`)
        const success = proc.kill()

        if (success) {
            this.portmap.delete(port)
            this.tunnels.delete(url)

            return success
        }
    }
}