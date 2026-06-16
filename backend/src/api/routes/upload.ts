import { FastifyInstance } from "fastify";
import { config } from "../../config";

/**
 * POST /api/upload
 * Body: { data: string (base64), filename: string, mimeType: string }
 * Pins the file to Pinata and returns the public IPFS gateway URL.
 */
export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  app.post("/", async (req, reply) => {
    if (!config.pinataJwt) {
      return reply.code(503).send({ error: "IPFS upload not configured (PINATA_JWT missing)" });
    }

    const body = req.body as { data?: string; filename?: string; mimeType?: string };

    if (!body.data || !body.filename) {
      return reply.code(400).send({ error: "data (base64) and filename are required" });
    }

    const mimeType = body.mimeType ?? "application/octet-stream";
    const buffer   = Buffer.from(body.data, "base64");

    // Build a FormData-compatible multipart body manually for Node fetch
    const boundary = "----NWOUploadBoundary" + Date.now().toString(16);
    const nl = "\r\n";

    const header =
      `--${boundary}${nl}` +
      `Content-Disposition: form-data; name="file"; filename="${body.filename}"${nl}` +
      `Content-Type: ${mimeType}${nl}${nl}`;
    const footer = `${nl}--${boundary}--${nl}`;

    const parts = [
      Buffer.from(header, "utf-8"),
      buffer,
      Buffer.from(footer, "utf-8"),
    ];
    const bodyBuffer = Buffer.concat(parts);

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${config.pinataJwt}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[upload] Pinata error:", text);
      return reply.code(502).send({ error: "Pinata upload failed", detail: text });
    }

    const json = await res.json() as { IpfsHash: string };
    const url  = `https://gateway.pinata.cloud/ipfs/${json.IpfsHash}`;

    return reply.send({ url, cid: json.IpfsHash });
  });
}