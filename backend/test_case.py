from sqlalchemy import case, Column, Integer, Boolean, MetaData, Table
meta = MetaData()
t = Table('t', meta, Column('x', Integer))
c = case((t.c.x > 0, 1), else_=0)
print(c)
