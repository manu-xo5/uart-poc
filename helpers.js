const readline = require("node:readline");

const sleep = (ms = 500) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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


module.exports = {
  input,
  sleep,
}
