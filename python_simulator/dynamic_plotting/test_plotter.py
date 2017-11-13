import numpy as np
import matplotlib.pyplot as plt
import time
import threading

# x = np.arange(0, 10, 0.1)
# y = np.sin(x)
# x = []
# y = []


def dynamic_plot(x, y, update):
    plt.ion()
    ax = plt.gca()
    ax.set_autoscale_on(True)
    line, = ax.plot(x, y)

    for i in range(1000):
        line.set_xdata(x)
        line.set_ydata(y)
        ax.relim()
        ax.autoscale_view(True,True,True)
        plt.draw()
        update(i, x, y)
        # x.append(i)
        # y.append(np.random.rand())
        plt.pause(0.1)

def update(i, x, y):
    x.append(i)
    y.append(np.random.rand())
        
if __name__ == "__main__":
    x, y = [], []
    dynamic_plot(x, y, update)
    
    # t1 = threading.Thread(target=dynamic_plot, args=(x, y))
    # t2 = threading.Thread(target=update, args=(x, y))
    
    # t1.start()
    # t2.start()

    # t1.join()
    # t2.join()
    
    # for i in range(1000):
    #     time.sleep(0.1)
    #     x.append(i)
    #     y.append(np.random.rand())
    
