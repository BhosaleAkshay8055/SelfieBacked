import threading
import time
import random
from queue import Queue

# Producer thread that reads data from the network (simulated)


list1 = [1,2,3]

A = int(123123123) 
def producer(queue):
    for _ in range(5):
        data = random.randint(1, 100)  # Simulate data from the network
        print(f"Produced: {data}")
        queue.put(data)  # Put the data into the queue
        time.sleep(1)  # Simulate network delay
    queue.put(None)  # Add None to signal the consumer to stop

# Consumer thread that writes data to a file
def consumer(queue):
    with open('output.txt', 'w') as f:
        while True:
            data = queue.get()  # Wait for data from the producer
            if data is None:  # Stop condition
                break
            print(f"Consumed: {data}")
            f.write(f"{data}\n")  # Write data to the file
            time.sleep(1)  # Simulate file write delay

# Main function to create threads and start them
def main():
    queue = Queue()
    # Create producer and consumer threads
    producer_thread = threading.Thread(target=producer, args=(queue,))
    consumer_thread = threading.Thread(target=consumer, args=(queue,))

    # Start the threads
    producer_thread.start()
    consumer_thread.start()

    # Wait for both threads to finish
    producer_thread.join()
    consumer_thread.join()

    print("Processing complete.")

if __name__ == '__main__':
    main()
