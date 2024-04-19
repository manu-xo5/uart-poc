const { sleep } = require("./helpers");

const CMD = {
  gate_sol: 45,
  gate_mag: 8,
  stp_can: 19,
  stp_motor: 17,
  home: 3,
  pump: 6,
  nfc_can: 11,
};

const pojo = {
  45: {
    name: "gateSolonoid",
    cmd: 45,
    returns: {
      len: 3,
      status: {
        pos: 2,
        successValue: 0,
        errorValue: 255,
      },
    },
  },
  8: {
    name: "gateMagnet",
    cmd: 8,
    returns: {
      len: 3,
      status: {
        pos: 2,
        successValue: 0,
        errorValue: 255,
      },
    },
  },
  11: {
    name: "nfcCan",
    cmd: 11,
    returns: {
      len: 7,
      status: {
        pos: 1,
        successValue: "not0",
        errorValue: 0,
      },
    },
  },

  17: {
    name: "stpMotor",
    cmd: 17,
    returns: {
      len: 4,
      status: {
        pos: 1,
        successValue: 0,
        errorValue: 255,
      },
    },
  },
};

class UartImpl {
  connector = () => {};
  /** @type {Int8Array[][]} */
  rx = Array(10).fill(new Int8Array(0));
  receiver = (data) => {
    // /** @type {Number} */
    const newHead = new Uint8Array(data);
    this.rx.unshift(newHead);
    this.rx.pop();

    console.log("------------");
    console.log("Received data");
    console.dir(newHead);
    console.log("------------");
  };

  constructor(connector) {
    this.connector = connector;
  }

  make8Bytes(data) {
    const x = new Int8Array(data);
    console.dir(x, { depth: null });
    return x;
  }

  readRx(len = 1) {
    return this.rx.slice(0, len);
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

  async readNFC(nfcReaderId) {
    this.connector(this.make8Bytes([CMD.nfc_can, nfcReaderId]));
    await sleep(3000);
    const data = this.readRx(2);

    const correctOrder = []
      .concat(...data[1])
      .concat(...data[0])
      .slice(1);

    console.log("correctOrder", correctOrder);
    return String.fromCharCode(...correctOrder);
  }

  async moveStpCan(dir, value) {
    this.connector(this.make8Bytes([19]));
    await sleep(1000);
    this.connector(this.make8Bytes([dir === 1 ? 0 : -1, value * dir]));
    return sleep();
  }

  async moveStpMotor(pos) {
    let cmd = CMD.stp_motor;
    this.connector(this.make8Bytes([cmd]));
    await sleep();
    this.connector(this.make8Bytes(pos));
    await sleep(5000);

    const rx = this.readRx(1).flatMap((x) => Array.from(x));
    const errorIdx = 1;
    const errorValue = 255;

    if (rx[errorIdx] === errorValue) {
      throw new Error("Error moving stp motor");
    }

    return sleep();
  }

  async controlCanisterLock(shouldOpen) {
    const value = shouldOpen ? 1 : 0;
    this.connector(this.make8Bytes([30]));
    this.connector(this.make8Bytes([value]));
    await sleep();
  }

  async homePillbox() {
    this.connector(this.make8Bytes([26]));
    await sleep();
  }

  async moveStpPillbox(dir, value) {
    this.connector(this.make8Bytes([4]));
    await sleep();
    this.connector(this.make8Bytes([dir === 1 ? 0 : -1, value * dir]));
    await sleep();
  }
}

class Uart extends UartImpl {
  constructor(connector, receiver) {
    super(connector, receiver);
  }

  async openGate() {
    await this.controlGateMagnet(false);
    await this.controlGateSolonoid(true);
    await this.controlGateSolonoid(false);
    await this.controlGateMagnet(true);
  }

  readCanister() {
    return this.readNFC(1);
  }

  readPillbox() {
    return this.readNFC(2);
  }

  moveStpToPickPosition() {
    return this.moveStpMotor([1, 0]);
  }

  moveStpToDropPosition() {
    return this.moveStpMotor([0, 1]);
  }
}

module.exports = {
  Uart,
};
