const readline = require("node:readline");
const io = require("socket.io-client");
const http = require("http");
const express = require("express");

const server = http.createServer();

const fs = require("fs");

const socket = io.connect("http://192.168.1.12:3000");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const input = () =>
  new Promise((resolve) => {
    rl.question("Enter:\n", (answer) => {
      resolve(answer);
    });
  });

const send8Bytes = (data) => {
  const x = new Int8Array(data);
  console.log(x, { depth: null });
  return x;
};
const send16Bytes = (data) => {
  const x = new Int16Array(data);
  console.dir(x, { depth: null });
  return x;
};

class Uart {
  connector = () => {};

  make8Bytes(data) {
    const x = new Int8Array(data);
    console.log(x, { depth: null });
    return x;
  }

  constructor(connector) {
    this.connector = connector;
  }

  controlGateSolonoid(shouldOpen = false) {
    const value = shouldOpen ? 1 : 0;
    this.connector(this.make8Bytes([45, value]));
    return sleep();
  }

  controlGateMagnet(shouldOpen = false) {
    const value = shouldOpen ? 1 : 0;
    this.connector(this.make8Bytes([8, value]));
    return sleep();
  }

  async moveStpCan(dir, value) {
    this.connector(this.make8Bytes([19]));
    await sleep();
    this.connector(this.make8Bytes([dir === 1 ? 0 : -1, value * dir]));
    return sleep();
  }

  async home() {
    this.connector(this.make8Bytes([3]));
    await sleep();
    this.connector(this.make8Bytes([0, 0]));
    return sleep();
  }

  controlPump(shouldOpen = false) {
    const value = shouldOpen ? 1 : 0;
    this.connector(this.make8Bytes([6, value]));
    return sleep();
  }
}

socket.on("connect", async () => {
  console.log("connected");
  const uart = new Uart((bytes) => socket.emit("uart:send", bytes));

  while (true) {
    const values = await input();
    console.log(values.trim() === "open_gate");
    if (values === "open_gate") {
      (async () => {
        await uart.controlGateMagnet(false);
        await uart.controlGateSolonoid(true);
        await sleep(1000);
        await uart.controlGateSolonoid(false);
        await uart.controlGateMagnet(true);
      })();
    } else if (values === "move_cx") {
      (async () => {
        await uart.moveStpCan(1, 6);
      })();
    } else if (values === "home") {
      (async () => {
        await uart.home();
      })();
    }
    if (values === "dispense") {
      (async () => {
        await uart.controlPump(true);
      })();
    } else {
      socket.emit("uart:send", send8Bytes(values.split(" ").map((x) => +x)));
    }
  }
});

socket.on("uart:receive", (data) => {
  try {
    console.log("received", data, 1);
  } catch (error) {
    console.error(error);
  }
  console.log(data);
});

socket.on("error", (error) => {
  console.log("failed");
  console.error(error);
});

process.on("SIGINT", () => {
  socket.disconnect();
  process.exit();
});

server.listen(3000);

////////////////////////////////////
function sleep(ms = 500) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function wait(fn, ms = 100) {
  const res = fn();
  await sleep(ms);
  return res;
}
