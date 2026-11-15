#include <stdio.h>
int main() { int W = 8, P = 3; printf("[%*d][%-*d][%*.*f][%.*f][%*s][%.*s]\n", W, 42, W, 42, W, P, 3.14159, P, 2.0, W, "ab", 2, "abcdef"); printf("[%*d][%*.*f]\n", -6, 7, 10, 0, 2.5); return 0; }
