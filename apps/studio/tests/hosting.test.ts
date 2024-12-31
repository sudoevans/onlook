import { describe, it } from 'bun:test';
import { readFile } from 'fs/promises';
import { glob } from 'glob';

const MOCK_FILES = {
    'server.js': `import http from "node:http";

console.log("starting server");

const server = http.createServer(async(req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("TEST 1");
});

server.listen(3000, () => {
  console.log("Server is running at http://localhost:3000");
});`,
};

describe('Hosting', () => {
    it('make request', async () => {
        const PATH = '/Users/kietho/workplace/onlook/test/test-err/.next/standalone';
        const files = await getFolderFiles(PATH);
        const data: MakeRequestData = {
            files: files,
            metadata: {
                domains: ['test.swerdlow.dev'],
                entrypoint: 'server.js',
                envVars: null,
                projectId: null,
            },
        };
        const result = await makeRequest(data);
        console.log(result);
    });
});

const BINARY_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.ico',
    '.webp',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.zip',
    '.tar',
    '.gz',
    '.7z',
    '.rar',
    '.mp3',
    '.mp4',
    '.avi',
    '.mov',
    '.ttf',
    '.woff',
    '.woff2',
    '.eot',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.wasm',
]);

function isBinaryPath(filePath: string): boolean {
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    return BINARY_EXTENSIONS.has(ext);
}

export async function getFolderFiles(
    folderPath: string,
    ignore: string[] = [],
): Promise<Record<string, string>> {
    const files = await glob('**/*', {
        cwd: folderPath,
        nodir: true,
        ignore,
        dot: true,
    });

    const fileContents = await Promise.all(
        files.map(async (file) => {
            if (isBinaryPath(file)) {
                // Read binary files as buffer and convert to base64
                const content = await readFile(`${folderPath}/${file}`);
                return [file, content.toString('base64')] as const;
            } else {
                // Read text files as utf-8
                const content = await readFile(`${folderPath}/${file}`, 'utf-8');
                return [file, content] as const;
            }
        }),
    );

    return Object.fromEntries(fileContents);
}

interface MakeRequestData {
    files: Record<string, string>;
    metadata: {
        domains: string[];
        entrypoint: string;
        envVars: string | null;
        projectId: string | null;
    };
}

async function makeRequest(data: MakeRequestData): Promise<Response | undefined> {
    try {
        const TOKEN = 'supersecretcode';
        const response = await fetch('https://api.freestyle.sh/web/v1/deploy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${TOKEN}`,
            },
            body: JSON.stringify(data),
        });

        return response;
    } catch (error) {
        console.error('Error:', error);
    }
}
