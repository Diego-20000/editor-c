#include <stdio.h>
int main() { double X = 3.14159, N = -2.5; printf("[%8.2f][%-8.2f][%08.2f][%+8.2f][% 8.2f][%+.0f][%#.0f][%8.0f]\n", X, X, X, X, X, X, X, X); printf("[%8.2f][%-8.2f][%08.2f][%+08.2f][% .2f]\n", N, N, N, N, N); printf("[%5.2f][%2.5f][%.2f]\n", 12345.678, 1.5, 99.999); return 0; }
