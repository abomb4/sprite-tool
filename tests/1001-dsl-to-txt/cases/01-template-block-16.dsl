dsl 1
size 16 16
template block
palette {
  1 #FF0000
  2 #00FF00
  3 #0000FF
  4 #FFFF00
}
series 1 2 3

line 7,0 7,3 0 1
line 14,0 11,3 0 4
line 15,0 10,5 0 2

line 0,0 7,7 0 4

bitmap 6,4 {
 123
 321
 324
}

// filled rectangle (1,0)-(4,4)
poly 1,0 4,0 4,4 3

// another rect (5,0)-(8,2)
rect 5,0 8,2 0 2