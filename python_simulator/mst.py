from abc import ABC, abstractmethod

def n_union(set_list):
    result = set()
    for l in set_list:
        result = result.union(l)
    return result

class MST(ABC):
    """
    Minimum Spanning Tree abstract class

    """
    def __init__(self, objs, key):
        """
        Construct the set of edges from the list of objects with key func.
        Key func should transform objects to edges of format
        
        (int weight, str start, str end)
        
        Noted that edges are directed. If you wish to construct undirected
        graph just ignore the order of the vertices
        """
        self.edges = sorted(map(key, objs))
        self.vertices = n_union([[v_i,v_j] for w,v_i,v_j in self.edges])

    @abstractmethod
    def calc_mst(self):
        pass
    

class Kruskal(MST):
    def __init__(self, objs, key):
        super(Kruskal, self).__init__(objs, key)
        self.parent = dict()
        self.rank = dict()
        self.mst = dict()

    def calc_mst(self):
        for vertice in self.vertices:
            self.make_set(vertice)

        minimum_spanning_tree = set()
        for edge in self.edges:
            print(edge)
            weight, vertice1, vertice2 = edge
            # root1 = self.find_root(vertice1)
            # root2 = self.find_root(vertice2)
            # print('root1', self.find_root(vertice1))
            # print('root2', self.find_root(vertice2))
            # if root1 != root2:
            if self.union(vertice1, vertice2):
                # self.union(vertice1, vertice2)
                # print('after union')
                # print('root1', self.find_root(vertice1))
                # print('root2', self.find_root(vertice2))
                minimum_spanning_tree.add(edge)
        self.mst = minimum_spanning_tree

    def make_set(self, vertice):
        self.parent[vertice] = vertice
        self.rank[vertice] = 0

    def find_root(self, vertice):
        print('vertice', vertice)
        print('parent', self.parent[vertice])
        if self.parent[vertice] != vertice:
            self.parent[vertice] = self.find_root(self.parent[vertice])
        return self.parent[vertice]

    def union(self, vertice1, vertice2):
        """
        Return: whether the union is successful or not
        """
        root1 = self.find_root(vertice1)
        root2 = self.find_root(vertice2)
        if root1 != root2:
            if self.rank[root1] > self.rank[root2]:
                self.parent[root2] = root1
            else:
                self.parent[root1] = root2
                if self.rank[root1] == self.rank[root2]:
                    self.rank[root2] += 1
            return True
        else:
            return False

if __name__ == '__main__':
    objs = [(1, 'A', 'B'),
            (5, 'A', 'C'),
            (3, 'A', 'D'),
            (4, 'B', 'C'),
            (2, 'B', 'D'),
            (1, 'C', 'D')]

    mst = set([(1, 'A', 'B'),
               (2, 'B', 'D'),
               (1, 'C', 'D')])

    k = Kruskal(objs, key=lambda i:i)
    k.calc_mst()
    print(k.mst)

    assert k.mst == mst
