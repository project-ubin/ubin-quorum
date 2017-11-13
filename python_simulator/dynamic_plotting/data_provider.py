import time
import numpy as np


f = open('test', 'w')
for i in range(30):
    time.sleep(0.5)
    f.write('%d,%f\n' % (i, np.random.rand()))
f.close()
