import matplotlib.pyplot as plt
import matplotlib.animation as animation
import time
import numpy as np
import os
import fcntl
import threading


class DynamicPlotter:
    def __init__(self, data_path):
        f = open(data_path, 'r')
        fd = f.fileno()
        flag = fcntl.fcntl(fd, fcntl.F_GETFL)
        fcntl.fcntl(fd, fcntl.F_SETFL, flag | os.O_NONBLOCK)
        flag = fcntl.fcntl(fd, fcntl.F_GETFL)
        if flag & os.O_NONBLOCK:
            print("O_NONBLOCK!!")
        # self.data = open(data_path, 'r').read()
        self.data = f.read()
        self.fig = plt.figure()
        self.ax1 = self.fig.add_subplot(1,1,1)

    def plot_2d(self, i):
        points = [list(map(float, line.split(','))) for line in self.data.split('\n') if line!='']
        self.ax1.clear()
        self.ax1.plot(*(zip(*points)))

    def show(self):
        a = animation.FuncAnimation(self.fig, self.plot_2d, interval=1000)
        plt.show()
        
def write_data():
    f = open('test', 'w')
    for i in range(30):
        time.sleep(0.3)
        f.write('%d,%f\n' % (i, np.random.rand()))
    f.close()


if __name__ == "__main__":
    dp = DynamicPlotter('test')
    
    t = threading.Thread(target=write_data)
    t.start()
    
    dp.show()
    
    # fig = plt.figure()
    # ax1 = fig.add_subplot(1,1,1)
    # f = open('test', 'w')
    
    # def animate(i):
    #     # data_file = open('test', 'r').read()
    #     data_file = f.getvalue()
    #     points = [list(map(float, line.split(','))) for line in data_file.split('\n') if line!='']
    #     ax1.clear()
    #     ax1.plot(*(zip(*points)))

    # ani = animation.FuncAnimation(fig, animate, interval=20)
    # plt.show()
    
