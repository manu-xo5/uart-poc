const socket = require("socket.io-client").connect("http://192.168.1.14:3000");
const server = require("http").createServer();
const { sleep, input } = require("./helpers");
const { Uart } = require("./uart");

const connector = (bytes) => {
  socket.emit("uart:send", bytes);
};

// const puller = (noBytes) => {
//   socket.emit("uart:pull", noBytes);
//
//   return new Promise((res, rej) => {
//     const listener = (data) => {
//       res(data);
//       console.log("listener removed");
//       socket.removeListener("uart:pull-receive", listener);
//     };
//
//     setTimeout(() => {
//       rej(null)
//       console.log("listener removed");
//       socket.removeListener("uart:pull-receive", listener);
//     }, 4000)
//
//     socket.on("uart:pull-receive", listener);
//   });
// };

const uart = new Uart(connector);

socket.on("connect", async () => {
  console.log("connected");

  while (true) {
    const values = await input();
    switch (values) {
      case "open_gate": {
        await uart.openGate();
        break;
      }

      case "move_cx": {
        await uart.moveStpCan(1, 6);
        break;
      }

      case "home": {
        await uart.home();
        break;
      }

      case "dispense": {
        await uart.controlPump(true);
        break;
      }

      case "readCan": {
        const canisterId = await uart.readCanister();
        console.log("nfc:", canisterId);
        break;
      }

      case "readPillbox": {
        const pillboxId = await uart.readPillbox();
        console.log("nfc:", pillboxId);
        break;
      }

      default: {
        const [cmd, ...args] = values.split(" ").map((x) => +x);
        socket.emit("uart:send", uart.make8Bytes([cmd]));
        socket.emit("uart:send", uart.make8Bytes([...args]));
        await sleep();
        continue;
      }
    }
  }
});

socket.on("uart:receive", (data) => {
  uart.receiver(data);
});

socket.on("error", (error) => {
  console.log("failed");
  console.error(error);
});

process.on("SIGINT", () => {
  socket.disconnect();
  process.exit();
});
process.on("exit", () => {
  socket.disconnect();
});

server.listen(3000);
