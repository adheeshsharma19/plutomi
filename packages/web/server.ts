import { createRequestHandler } from "@remix-run/express";
import { broadcastDevReady } from "@remix-run/node";
import express from "express";
import * as build from "./build/index.js";

const app = express();
app.use(express.static("public"));
app.set("trust proxy", true);

app.get("/healthz", (req, res) => {
  // K8s health check
  res.sendStatus(200);
});

app.all(
  "*",
  createRequestHandler({
    // @ts-expect-error - testing remix
    build
  })
);

app.listen(3000, "0.0.0.0", () => {
  if (process.env.NODE_ENV === "development") {
    // @ts-expect-error - testing remix
    broadcastDevReady(build);
  }
  console.log("Remix listening on http://localhost:3000");
});
