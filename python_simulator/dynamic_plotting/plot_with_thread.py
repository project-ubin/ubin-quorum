import numpy as np
import matplotlib.pyplot as plt
import time
import threading

def update(x, y):
    for i in range(100):
        # clear
        plt.clf()
        plt.plot(x, y)
        # draw figure
        plt.draw()
        time.sleep(1)
        y=y*1.1

x = np.arange(0, 10, 0.1);
y = np.sin(x)
plt.plot(x, y)

# use thread
t = threading.Thread(target=update, args=(x, y))
t.start()

plt.show() # blocking but thread will update figure.
