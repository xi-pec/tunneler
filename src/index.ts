import { dirname } from "path";
import { fileURLToPath } from "url";

async function main(): Promise<void> {
    global.__filename = fileURLToPath(import.meta.url);
    global.__dirname = dirname(__filename);
}

main();