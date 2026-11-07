#include <stdio.h>
float f(int);
int f(int x) { return x; }
int main() { printf("%d\n", f(2)); return 0; }
