const http = require("node:http");
const { createRuntime } = require("./runtime.cjs");

const { app } = createRuntime(process.env);
const port = Number(process.env.PORT || 9000);

http.createServer((req, res) => {
  const chunks = [];
  req.on("data", chunk => chunks.push(chunk));
  req.on("end", async () => {
    try {
      const response = await app({
        method: req.method,
        path: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks),
        ip: req.socket.remoteAddress ?? "local",
      });
      res.statusCode = response.statusCode;
      for (const [name, value] of Object.entries(response.headers)) res.setHeader(name, value);
      res.end(response.body);
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "internal_error" }));
    }
  });
}).listen(port, () => console.log(`Yz membership API listening on http://localhost:${port}`));
