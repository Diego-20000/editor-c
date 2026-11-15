#include <stdio.h>
int N = 0;
int f(int V) { N++; printf("f%d ", V); return V; }
int main() { int R; R = f(0) && f(1); printf("-> %d\n", R); R = f(1) || f(0); printf("-> %d\n", R); R = f(1) && f(0) || f(2); printf("-> %d\n", R); R = f(0) || f(0) && f(3); printf("-> %d\n", R); R = (f(5), f(6)); printf("-> %d %d\n", R, N); R = f(0) ? f(1) : f(2); printf("-> %d\n", R); return 0; }
