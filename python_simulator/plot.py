from matplotlib.collections import LineCollection
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
import argparse
import os
import re


def plot(f_name, acc_names=None):
    df = pd.read_csv(f_name)
    
    if acc_names is None:
        n_accs = max(map(int, filter(lambda i:i!='',
                                     [re.match(r'[0-9]*', c).group() for c in df.columns]))) + 1
        position_cols = list(map(str,range(n_accs)))
        balance_cols = list(map(lambda n: 'b'+str(n),range(n_accs)))
    else:
        position_cols = list(acc_names)
        balance_cols = list(map(lambda n: 'b'+n, acc_names))
        
    f, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2)
    f.suptitle(f_name[:f_name.find('.csv')], fontsize=14)
    
    ax1.plot(df[position_cols])
    ax1.set_title('positions')
    ax2.plot(df[balance_cols])
    ax2.set_title('balances')
    
    n_def = ax3.plot(df['n_deficits'], label='n_deficits', color='C3')
    ax3a = ax3.twinx()
    def_amt = ax3a.plot(df['deficit_amount'], label='total deficit amount', color='C4')
    lns = n_def + def_amt # added these two lines to combine the legends
    labs = [l.get_label() for l in lns]
    ax3.legend(lns, labs, loc=0)
    
    q_amt = ax4.plot(df['queued_amount'], label='queued amount', color='C1')
    ax4a = ax4.twinx()
    q_len = ax4a.plot(df['queue_length'], label='queue length', color='C2')
    lns = q_amt + q_len 
    labs = [l.get_label() for l in lns]
    ax4.legend(lns, labs, loc=0)

    plt.show(block=False)
        

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file",
                        default='all',
                        help="simulation data (csv file) for plotting",
                        type=str)
    args = parser.parse_args()

    if args.file == 'all':
        for f in os.listdir():
            if '.csv' in f:
                plot(f)
            elif '.txt' in f:
                print(f)
                with open(f, 'r') as f_in:
                    print(f_in.read())
    else:            
        plot(args.file)

    plt.show()


    
    # points = np.random.randint(0, 100, (30, 2))
    # edges = np.random.randint(0, 30, (60, 2))
    # print(points)
    # print(edges)
    # lc = LineCollection(points[edges])
    # fig = plt.figure()
    # plt.gca().add_collection(lc)
    # plt.xlim(points[:,0].min(), points[:,0].max())
    # plt.ylim(points[:,1].min(), points[:,1].max())
    # plt.plot(points[:,0], points[:,1], 'ro')
    # plt.show()
    # fig.savefig('full_figure.png')
