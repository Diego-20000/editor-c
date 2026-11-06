#include <stdio.h>
int f(){static int c=0;c++;return c;}
int main(){f();f();printf("%d\n",f());return 0;}
