
const { Worker } = require('worker_threads');

class WorkerPool {
  constructor(workerFile, poolSize = 4) {
    this.workers = [];
    this.queue = [];
    this.poolSize = poolSize;

    for (let i = 0; i < poolSize; i++) {
      this.workers.push(this.createWorker(workerFile));
    }
  }

  createWorker(workerFile) {
    const worker = new Worker(workerFile);

    worker.on('message', (result) => {
      const callback = worker.callback;
      worker.callback = null;
      callback(result);

      if (this.queue.length > 0) {
        const { data, callback } = this.queue.shift();
        worker.callback = callback;
        worker.postMessage(data);
      } else {
        worker.busy = false;
      }
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
    });

    return worker;
  }

  run(data, callback) {
    const availableWorker = this.workers.find(worker => !worker.busy);

    if (availableWorker) {
      availableWorker.busy = true;
      availableWorker.callback = callback;
      availableWorker.postMessage(data);
    } else {
      this.queue.push({ data, callback });
    }
  }
}

module.exports = WorkerPool;