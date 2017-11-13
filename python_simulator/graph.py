import networkx as nx
import pygraphviz as pgv # need pygraphviz or pydot for nx.to_agraph()
import matplotlib.pyplot as plt

G = nx.DiGraph()
G.add_edge(1,2,weight=7)
G.add_edge(2,3,weight=8)
G.add_edge(3,4,weight=1)
G.add_edge(4,1,weight=11)
G.add_edge(1,3)
G.add_edge(2,4)

for u,v,d in G.edges(data=True):
    d['label'] = d.get('weight','')

nx.draw(G, pos=nx.drawing.nx_agraph.graphviz_layout(G), node_size=1600, cmap=plt.cm.Blues,
        node_color=range(len(G)),
        prog='dot')
plt.show()


# A = nx.to_agraph(G)
# A.layout(prog='dot')
# A.draw('test.png')


# import networkx as nx
# import pylab as plt
# from networkx.drawing.nx_agraph import graphviz_layout


# G = nx.DiGraph()
# G.add_node(1,level=1)
# G.add_node(2,level=2)
# G.add_node(3,level=2)
# G.add_node(4,level=3)

# G.add_edge(1,2)
# G.add_edge(1,3)
# G.add_edge(2,4)

# nx.draw(G, pos=graphviz_layout(G), node_size=1600, cmap=plt.cm.Blues,
#         node_color=range(len(G)),
#         prog='dot')
# plt.show()
