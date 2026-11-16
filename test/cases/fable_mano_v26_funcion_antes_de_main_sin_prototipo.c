#include <stdio.h>
int cubo(int X) { return X * X * X; }
void linea(int N) { while (N-- > 0) putchar('-'); putchar('\n'); }
int main() { linea(cubo(2)); printf("%d\n", cubo(cubo(2))); return 0; }
